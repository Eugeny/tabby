/* eslint-disable @typescript-eslint/no-unused-vars */
import { Subject, Observable } from 'rxjs'
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

    // constructor (
    //     private sftp: russh.SFTP,
    //     private handle: Buffer,
    //     private zone: NgZone,
    // ) { }

    read (): Promise<Buffer> {
        throw new Error('Not implemented')
        // const buffer = Buffer.alloc(256 * 1024)
        // return wrapPromise(this.zone, new Promise((resolve, reject) => {
        //     while (true) {
        //         const wait = this.sftp.read(this.handle, buffer, 0, buffer.length, this.position, (err, read) => {
        //             if (err) {
        //                 reject(err)
        //                 return
        //             }
        //             this.position += read
        //             resolve(buffer.slice(0, read))
        //         })
        //         if (!wait) {
        //             break
        //         }
        //     }
        // }))
    }

    write (chunk: Buffer): Promise<void> {
        throw new Error('Not implemented')
        // return wrapPromise(this.zone, new Promise<void>((resolve, reject) => {
        //     while (true) {
        //         const wait = this.sftp.write(this.handle, chunk, 0, chunk.length, this.position, err => {
        //             if (err) {
        //                 reject(err)
        //                 return
        //             }
        //             this.position += chunk.length
        //             resolve()
        //         })
        //         if (!wait) {
        //             break
        //         }
        //     }
        // }))
    }

    close (): Promise<void> {
        throw new Error('Not implemented')
        // return wrapPromise(this.zone, promisify(this.sftp.close.bind(this.sftp))(this.handle))
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

    async open (p: string, mode: string): Promise<SFTPFileHandle> {
        throw new Error('Not implemented')
        // this.logger.debug('open', p)
        // const handle = await wrapPromise(this.zone, promisify<Buffer>(f => this.sftp.open(p, mode, f))())
        // return new SFTPFileHandle(this.sftp, handle, this.zone)
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
        throw new Error('Not implemented')
        // this.logger.info('Uploading into', path)
        // const tempPath = path + '.tabby-upload'
        // try {
        //     const handle = await this.open(tempPath, 'w')
        //     while (true) {
        //         const chunk = await transfer.read()
        //         if (!chunk.length) {
        //             break
        //         }
        //         await handle.write(chunk)
        //     }
        //     handle.close()
        //     try {
        //         await this.unlink(path)
        //     } catch { }
        //     await this.rename(tempPath, path)
        //     transfer.close()
        // } catch (e) {
        //     transfer.cancel()
        //     this.unlink(tempPath)
        //     throw e
        // }
    }

    async download (path: string, transfer: FileDownload): Promise<void> {
        throw new Error('Not implemented')
        // this.logger.info('Downloading', path)
        // try {
        //     const handle = await this.open(path, 'r')
        //     while (true) {
        //         const chunk = await handle.read()
        //         if (!chunk.length) {
        //             break
        //         }
        //         await transfer.write(chunk)
        //     }
        //     transfer.close()
        //     handle.close()
        // } catch (e) {
        //     transfer.cancel()
        //     throw e
        // }
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
