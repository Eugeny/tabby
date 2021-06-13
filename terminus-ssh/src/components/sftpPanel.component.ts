import { Component, Input, Output, EventEmitter } from '@angular/core'
import type { FileEntry } from 'ssh2-streams'
import { SSHSession, SFTPSession } from '../api'
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
    sftp: SFTPSession
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
        this.fileList = await this.sftp.readdir(this.path)

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
            const target = await this.sftp.readlink(itemPath)
            const stat = await this.sftp.stat(target)
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
            const handle = await this.sftp.open(itemPath, 'w')
            while (true) {
                const chunk = await transfer.read()
                if (!chunk.length) {
                    break
                }
                await handle.write(chunk)
            }
            handle.close()
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
            const handle = await this.sftp.open(itemPath, 'r')
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
