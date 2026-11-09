/* eslint-disable @typescript-eslint/no-unused-vars */
import { Subject, Observable } from 'rxjs'
import { posix as posixPath } from 'path'
import * as crypto from 'crypto'
import { Injector } from '@angular/core'
import { FileDownload, FileUpload, Logger, LogService } from 'tabby-core'
import * as russh from 'russh'

// SSH_FXF_EXCL in SFTP v3. russh accepts this flag but does not export it.
const OPEN_EXCLUSIVE = 0x20

export interface SFTPFile {
    name: string
    fullPath: string
    isDirectory: boolean
    isSymlink: boolean
    mode: number
    size: number
    modified: Date
}

export class SFTPFileHandle {
    position = 0

    constructor (
        private inner: russh.SFTPFile|null,
    ) { }

    async read (): Promise<Uint8Array> {
        if (!this.inner) {
            return Promise.resolve(new Uint8Array(0))
        }
        return this.inner.read(256 * 1024)
    }

    async write (chunk: Uint8Array): Promise<void> {
        if (!this.inner) {
            throw new Error('File handle is closed')
        }
        await this.inner.writeAll(chunk)
    }

    async close (): Promise<void> {
        await this.inner?.shutdown()
        this.inner = null
    }
}

export class SFTPSession {
    get closed$ (): Observable<void> { return this.closed }
    private closed = new Subject<void>()
    private logger: Logger
    private uploadPaths = new Set<string>()

    constructor (private sftp: russh.SFTP, injector: Injector) {
        this.logger = injector.get(LogService).create('sftp')
        sftp.closed$.subscribe(() => {
            this.closed.next()
            this.closed.complete()
        })
    }

    async readdir (p: string): Promise<SFTPFile[]> {
        this.logger.debug('readdir', p)
        const entries = await this.sftp.readDirectory(p)
        return entries.map(entry => this._makeFile(
            posixPath.join(p, entry.name), entry,
        ))
    }

    readlink (p: string): Promise<string> {
        this.logger.debug('readlink', p)
        return this.sftp.readlink(p)
    }

    async stat (p: string): Promise<SFTPFile> {
        this.logger.debug('stat', p)
        const stats = await this.sftp.stat(p)
        return {
            name: posixPath.basename(p),
            fullPath: p,
            isDirectory: stats.type === russh.SFTPFileType.Directory,
            isSymlink: stats.type === russh.SFTPFileType.Symlink,
            mode: stats.permissions ?? 0,
            size: stats.size,
            modified: new Date((stats.mtime ?? 0) * 1000),
        }
    }

    async open (p: string, mode: number): Promise<SFTPFileHandle> {
        this.logger.debug('open', p, mode)
        const handle = await this.sftp.open(p, mode)
        return new SFTPFileHandle(handle)
    }

    async rmdir (p: string): Promise<void> {
        await this.sftp.removeDirectory(p)
    }

    async mkdir (p: string): Promise<void> {
        await this.sftp.createDirectory(p)
    }

    async rename (oldPath: string, newPath: string): Promise<void> {
        this.logger.debug('rename', oldPath, newPath)
        await this.sftp.rename(oldPath, newPath)
    }

    async unlink (p: string): Promise<void> {
        await this.sftp.removeFile(p)
    }

    async chmod (p: string, mode: string|number): Promise<void> {
        this.logger.debug('chmod', p, mode)
        await this.sftp.chmod(p, mode)
    }

    async upload (path: string, transfer: FileUpload): Promise<void> {
        this.logger.info('Uploading into', path)
        const uploadPath = posixPath.normalize(path)
        if (this.uploadPaths.has(uploadPath)) {
            const error = new Error(`An upload to ${path} is already in progress`)
            transfer.setStatus(error.message)
            transfer.cancel()
            throw error
        }

        const directory = posixPath.dirname(path)
        const suffix = crypto.randomBytes(16).toString('hex')
        const tempPath = posixPath.join(directory, `.tabby-upload-${suffix}`)
        const backupPath = posixPath.join(directory, `.tabby-backup-${suffix}`)
        let handle: SFTPFileHandle | undefined = undefined
        let publishing = false
        this.uploadPaths.add(uploadPath)
        try {
            handle = await this.open(tempPath, russh.OPEN_WRITE | russh.OPEN_CREATE | OPEN_EXCLUSIVE)
            while (true) {
                const chunk = await transfer.read()
                if (transfer.isCancelled()) {
                    throw new Error('Upload cancelled')
                }
                if (!chunk.length) {
                    break
                }
                await handle.write(chunk)
            }
            await handle.close()
            if (transfer.isCancelled()) {
                throw new Error('Upload cancelled')
            }
            publishing = true
            await this.publishUpload(tempPath, path, backupPath)
            transfer.close()
        } catch (e) {
            if (handle && !publishing) {
                await handle.close().catch(() => null)
                await this.unlink(tempPath).catch(() => null)
            }
            transfer.setStatus(e instanceof Error ? e.message : String(e))
            transfer.cancel()
            throw e
        } finally {
            this.uploadPaths.delete(uploadPath)
        }
    }

    private async publishUpload (tempPath: string, path: string, backupPath: string): Promise<void> {
        const directory = posixPath.dirname(path)
        const name = posixPath.basename(path)
        try {
            await this.rename(tempPath, path)
            return
        } catch (e) {
            // The binding wraps SSH_FX_FAILURE as a Rust Debug string. A lost reply is
            // ambiguous and must not trigger a second attempt to replace the destination.
            const entries = e instanceof Error && /^Status\(Status \{ id: \d+, status_code: Failure,/.test(e.message)
                ? await this.readdir(directory).catch(() => null)
                : null
            const existing = entries?.find(entry => entry.name === name)
            if (!existing || existing.isDirectory || !entries?.some(entry => entry.name === posixPath.basename(tempPath))) {
                throw new Error(`Could not publish upload to ${path}. Check ${tempPath} for the uploaded file. ${e}`)
            }
        }

        try {
            await this.rename(path, backupPath)
        } catch (e) {
            throw new Error(`Could not move ${path} aside. Check ${backupPath} for the original and ${tempPath} for the upload. ${e}`)
        }
        try {
            await this.rename(tempPath, path)
        } catch (e) {
            // A second client may have created the destination, or the rename may have
            // succeeded before its reply was lost. Leave both recovery paths untouched.
            const entries = await this.readdir(directory).catch(() => null)
            if (entries && !entries.some(entry => entry.name === name)) {
                try {
                    await this.rename(backupPath, path)
                } catch (restoreError) {
                    throw new Error(`Could not replace or restore ${path}. Check ${backupPath} for the original and ${tempPath} for the upload. ${e}; ${restoreError}`)
                }
                throw new Error(`Could not replace ${path}. The original was restored. Check ${tempPath} for the upload. ${e}`)
            }
            throw new Error(`Could not confirm replacement of ${path}. Check ${backupPath} for the original and ${tempPath} for the upload. ${e}`)
        }
        await this.unlink(backupPath).catch(e => this.logger.warn('Could not remove upload backup', backupPath, e))
    }

    async download (path: string, transfer: FileDownload): Promise<void> {
        this.logger.info('Downloading', path)
        try {
            const handle = await this.open(path, russh.OPEN_READ)
            while (true) {
                const chunk = await handle.read()
                if (!chunk.length) {
                    break
                }
                await transfer.write(chunk)
            }
            transfer.close()
            handle.close()
        } catch (e) {
            transfer.setStatus(e instanceof Error ? e.message : String(e))
            transfer.cancel()
            throw e
        }
    }

    private _makeFile (p: string, entry: russh.SFTPDirectoryEntry): SFTPFile {
        return {
            fullPath: p,
            name: posixPath.basename(p),
            isDirectory: entry.metadata.type === russh.SFTPFileType.Directory,
            isSymlink: entry.metadata.type === russh.SFTPFileType.Symlink,
            mode: entry.metadata.permissions ?? 0,
            size: entry.metadata.size,
            modified: new Date((entry.metadata.mtime ?? 0) * 1000),
        }
    }
}
