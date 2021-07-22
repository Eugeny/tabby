import * as C from 'constants'
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports, no-duplicate-imports
import { posix as posixPath } from 'path'
import { NgZone } from '@angular/core'
import { wrapPromise } from 'tabby-core'
import { SFTPWrapper } from 'ssh2'
import { promisify } from 'util'

import type { FileEntry, Stats } from 'ssh2-streams'

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
        private sftp: SFTPWrapper,
        private handle: Buffer,
        private zone: NgZone,
    ) { }

    read (): Promise<Buffer> {
        const buffer = Buffer.alloc(256 * 1024)
        return wrapPromise(this.zone, new Promise((resolve, reject) => {
            while (true) {
                const wait = this.sftp.read(this.handle, buffer, 0, buffer.length, this.position, (err, read) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    this.position += read
                    resolve(buffer.slice(0, read))
                })
                if (!wait) {
                    break
                }
            }
        }))
    }

    write (chunk: Buffer): Promise<void> {
        return wrapPromise(this.zone, new Promise<void>((resolve, reject) => {
            while (true) {
                const wait = this.sftp.write(this.handle, chunk, 0, chunk.length, this.position, err => {
                    if (err) {
                        reject(err)
                        return
                    }
                    this.position += chunk.length
                    resolve()
                })
                if (!wait) {
                    break
                }
            }
        }))
    }

    close (): Promise<void> {
        return wrapPromise(this.zone, promisify(this.sftp.close.bind(this.sftp))(this.handle))
    }
}

export class SFTPSession {
    constructor (private sftp: SFTPWrapper, private zone: NgZone) { }

    async readdir (p: string): Promise<SFTPFile[]> {
        const entries = await wrapPromise(this.zone, promisify<FileEntry[]>(f => this.sftp.readdir(p, f))())
        return entries.map(entry => this._makeFile(
            posixPath.join(p, entry.filename), entry,
        ))
    }

    readlink (p: string): Promise<string> {
        return wrapPromise(this.zone, promisify<string>(f => this.sftp.readlink(p, f))())
    }

    async stat (p: string): Promise<SFTPFile> {
        const stats = await wrapPromise(this.zone, promisify<Stats>(f => this.sftp.stat(p, f))())
        return {
            name: posixPath.basename(p),
            fullPath: p,
            isDirectory: stats.isDirectory(),
            isSymlink: stats.isSymbolicLink(),
            mode: stats.mode,
            size: stats.size,
            modified: new Date(stats.mtime * 1000),
        }
    }

    async open (p: string, mode: string): Promise<SFTPFileHandle> {
        const handle = await wrapPromise(this.zone, promisify<Buffer>(f => this.sftp.open(p, mode, f))())
        return new SFTPFileHandle(this.sftp, handle, this.zone)
    }

    async rmdir (p: string): Promise<void> {
        await promisify((f: any) => this.sftp.rmdir(p, f))()
    }

    async rename (oldPath: string, newPath: string): Promise<void> {
        await promisify((f: any) => this.sftp.rename(oldPath, newPath, f))()
    }

    async unlink (p: string): Promise<void> {
        await promisify((f: any) => this.sftp.unlink(p, f))()
    }

    private _makeFile (p: string, entry: FileEntry): SFTPFile {
        return {
            fullPath: p,
            name: posixPath.basename(p),
            isDirectory: (entry.attrs.mode & C.S_IFDIR) === C.S_IFDIR,
            isSymlink: (entry.attrs.mode & C.S_IFLNK) === C.S_IFLNK,
            mode: entry.attrs.mode,
            size: entry.attrs.size,
            modified: new Date(entry.attrs.mtime * 1000),
        }
    }
}
