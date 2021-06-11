import { Component, Input, Output, EventEmitter } from '@angular/core'
import { SFTPWrapper } from 'ssh2'
import type { FileEntry, Stats } from 'ssh2-streams'
import { promisify } from 'util'
import { SSHSession } from '../api'
import * as path from 'path'
import * as C from 'constants'
import { FileUpload, PlatformService } from 'terminus-core'

interface PathSegment {
    name: string
    path: string
}

/** @hidden */
@Component({
    selector: 'sftp-panel',
    template: require('./sftpPanel.component.pug'),
    styles: [require('./sftpPanel.component.scss')],
})
export class SFTPPanelComponent {
    @Input() session: SSHSession
    @Output() closed = new EventEmitter<void>()
    sftp: SFTPWrapper
    fileList: FileEntry[]|null = null
    path = '/'
    pathSegments: PathSegment[] = []

    constructor (
        private platform: PlatformService,
    ) { }

    async ngOnInit (): Promise<void> {
        this.sftp = await this.session.openSFTP()
        this.navigate('/')
    }

    async navigate (newPath: string): Promise<void> {
        this.path = newPath

        let p = newPath
        this.pathSegments = []
        while (p !== '/') {
            this.pathSegments.unshift({
                name: path.basename(p),
                path: p,
            })
            p = path.dirname(p)
        }

        this.fileList = null
        this.fileList = await promisify<FileEntry[]>(f => this.sftp.readdir(this.path, f))()
        console.log(this.fileList)

        const dirKey = a => (a.attrs.mode & C.S_IFDIR) === C.S_IFDIR ? 1 : 0
        this.fileList.sort((a, b) =>
            dirKey(b) - dirKey(a) ||
            a.filename.localeCompare(b.filename))
    }

    getIcon (item: FileEntry): string {
        if ((item.attrs.mode & C.S_IFDIR) === C.S_IFDIR) {
            return 'fas fa-folder text-info'
        }
        if ((item.attrs.mode & C.S_IFLNK) === C.S_IFLNK) {
            return 'fas fa-link text-warning'
        }
        return 'fas fa-file'
    }

    goUp (): void {
        this.navigate(path.dirname(this.path))
    }

    async open (item: FileEntry): Promise<void> {
        const itemPath = path.join(this.path, item.filename)
        if ((item.attrs.mode & C.S_IFDIR) === C.S_IFDIR) {
            this.navigate(path.join(this.path, item.filename))
        } else if ((item.attrs.mode & C.S_IFLNK) === C.S_IFLNK) {
            const target = await promisify<string>(f => this.sftp.readlink(itemPath, f))()
            const stat = await promisify<Stats>(f => this.sftp.stat(target, f))()
            if (stat.isDirectory()) {
                this.navigate(itemPath)
            } else {
                this.download(itemPath, stat.size)
            }
        } else {
            this.download(itemPath, item.attrs.size)
        }
    }

    async upload (): Promise<void> {
        const transfers = await this.platform.startUpload({ multiple: true })
        const savedPath = this.path
        for (const transfer of transfers) {
            this.uploadOne(transfer).then(() => {
                if (this.path === savedPath) {
                    this.navigate(this.path)
                }
            })
        }
    }

    async uploadOne (transfer: FileUpload): Promise<void> {
        const itemPath = path.join(this.path, transfer.getName())
        try {
            const handle = await promisify<Buffer>(f => this.sftp.open(itemPath, 'w', f))()
            let position = 0
            while (true) {
                const chunk = await transfer.read()
                if (!chunk.length) {
                    break
                }
                const p = position
                await new Promise<void>((resolve, reject) => {
                    while (true) {
                        const wait = this.sftp.write(handle, chunk, 0, chunk.length, p, err => {
                            if (err) {
                                return reject(err)
                            }
                            resolve()
                        })
                        if (!wait) {
                            break
                        }
                    }
                })
                position += chunk.length
            }
            this.sftp.close(handle, () => null)
            transfer.close()
        } catch (e) {
            transfer.cancel()
            throw e
        }
    }

    async download (itemPath: string, size: number): Promise<void> {
        const transfer = await this.platform.startDownload(path.basename(itemPath), size)
        if (!transfer) {
            return
        }
        try {
            const handle = await promisify<Buffer>(f => this.sftp.open(itemPath, 'r', f))()
            const buffer = Buffer.alloc(256 * 1024)
            let position = 0
            while (true) {
                const p = position
                const chunk: Buffer = await new Promise((resolve, reject) => {
                    while (true) {
                        const wait = this.sftp.read(handle, buffer, 0, buffer.length, p, (err, read) => {
                            if (err) {
                                reject(err)
                                return
                            }
                            resolve(buffer.slice(0, read))
                        })
                        if (!wait) {
                            break
                        }
                    }
                })
                if (!chunk.length) {
                    break
                }
                await transfer.write(chunk)
                position += chunk.length
            }
            transfer.close()
            this.sftp.close(handle, () => null)
        } catch (e) {
            transfer.cancel()
            throw e
        }
    }

    getModeString (item: FileEntry): string {
        const s = 'SGdrwxrwxrwx'
        const e = '   ---------'
        const c = [
            0o4000, 0o2000, C.S_IFDIR,
            C.S_IRUSR, C.S_IWUSR, C.S_IXUSR,
            C.S_IRGRP, C.S_IWGRP, C.S_IXGRP,
            C.S_IROTH, C.S_IWOTH, C.S_IXOTH,
        ]
        let result = ''
        for (let i = 0; i < c.length; i++) {
            result += item.attrs.mode & c[i] ? s[i] : e[i]
        }
        return result
    }

    close (): void {
        this.closed.emit()
    }
}
