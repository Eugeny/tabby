/* eslint-disable @typescript-eslint/no-unused-vars */
import { Subject, Observable } from 'rxjs'
import { randomBytes } from 'crypto'
import { posix as posixPath } from 'path'
import { Injector } from '@angular/core'
import { FileDownload, FileUpload, Logger, LogService } from 'tabby-core'
import * as russh from 'russh'

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

    async close (): Promise<void> {
        await this.sftp.close()
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
        // unpredictable temp name: a fixed suffix is preexisting-file/symlink bait
        // on shared servers, and two uploads of the same file would collide
        const tempPath = `${path}.${randomBytes(4).toString('hex')}.tabby-upload`
        let handle: SFTPFileHandle|null = null
        let written: Promise<void>|null = null
        let renaming = false
        try {
            // TRUNCATE in case a crashed upload left a longer temp file behind
            handle = await this.open(tempPath, russh.OPEN_WRITE | russh.OPEN_CREATE | russh.OPEN_TRUNCATE)
            // pipeline: read the next chunk from disk while the previous one is in
            // flight to the server (the source buffer is copied per read)
            let chunk = await transfer.read()
            while (chunk.length) {
                written = handle.write(chunk)
                // no-op handler: if read() below throws, the in-flight write must
                // not become an unhandled rejection
                written.catch(() => null)
                const next = await transfer.read()
                await written
                written = null
                chunk = next
            }
            if (transfer.isCancelled()) {
                // a cancelled source reads as EOF — don't rename a partial file
                // over the target
                throw new Error('Transfer cancelled')
            }
            await handle.close()
            handle = null
            await this.unlink(path).catch(() => null)
            renaming = true
            await this.rename(tempPath, path)
            transfer.close()
        } catch (e) {
            if (transfer.isCancelled()) {
                transfer.cancel()
            } else {
                transfer.markFailed(e.message)
            }
            // settle the in-flight write, then close before unlink — some
            // servers refuse to delete open files
            await written?.catch(() => null)
            written = null
            await handle?.close().catch(() => null)
            handle = null
            if (!renaming) {
                await this.unlink(tempPath).catch(() => null)
            }
            // if the rename itself failed, the target is already gone — keep the
            // fully-written temp file instead of destroying the only copy
            throw e
        }
    }

    async download (path: string, transfer: FileDownload): Promise<void> {
        this.logger.info('Downloading', path)
        let handle: SFTPFileHandle|null = null
        let pending: Promise<Uint8Array>|null = null
        try {
            handle = await this.open(path, russh.OPEN_READ)
            // pipeline: request the next chunk from the server while the previous
            // one is being written to disk
            pending = handle.read()
            while (true) {
                const chunk = await pending
                if (!chunk.length || transfer.isCancelled()) {
                    pending = null
                    break
                }
                pending = handle.read()
                // no-op handler: if write() below throws, the in-flight read must
                // not become an unhandled rejection
                pending.catch(() => null)
                await transfer.write(chunk)
            }
            if (transfer.isCancelled()) {
                throw new Error('Transfer cancelled')
            }
            transfer.close()
        } catch (e) {
            // a genuine failure must read as "Failed" with its message, not as a
            // user cancel (which alone reads as EOF and sets isCancelled first)
            if (transfer.isCancelled()) {
                transfer.cancel()
            } else {
                transfer.markFailed(e.message)
            }
            throw e
        } finally {
            // settle the in-flight read before closing — closing a handle with a
            // request in flight puts two operations on the channel at once
            await pending?.catch(() => null)
            await handle?.close().catch(() => null)
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
