import { Component, Input, Output, EventEmitter } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { SSHSession } from '../api'
import { SFTPSession, SFTPFile } from '../session/sftp'
import { posix as path } from 'path'
import * as C from 'constants'
import { FileUpload, PlatformService } from 'tabby-core'
import { SFTPDeleteModalComponent } from './sftpDeleteModal.component'

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
    fileList: SFTPFile[]|null = null
    @Input() path = '/'
    @Output() pathChange = new EventEmitter<string>()
    pathSegments: PathSegment[] = []

    constructor (
        private platform: PlatformService,
        private ngbModal: NgbModal,
    ) { }

    async ngOnInit (): Promise<void> {
        this.sftp = await this.session.openSFTP()
        await this.navigate(this.path)
    }

    async navigate (newPath: string): Promise<void> {
        this.path = newPath
        this.pathChange.next(this.path)

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

        const dirKey = a => a.isDirectory ? 1 : 0
        this.fileList.sort((a, b) =>
            dirKey(b) - dirKey(a) ||
            a.name.localeCompare(b.name))
    }

    getIcon (item: SFTPFile): string {
        if (item.isDirectory) {
            return 'fas fa-folder text-info'
        }
        if (item.isSymlink) {
            return 'fas fa-link text-warning'
        }
        return 'fas fa-file'
    }

    goUp (): void {
        this.navigate(path.dirname(this.path))
    }

    async open (item: SFTPFile): Promise<void> {
        if (item.isDirectory) {
            await this.navigate(item.fullPath)
        } else if (item.isSymlink) {
            const target = path.resolve(this.path, await this.sftp.readlink(item.fullPath))
            const stat = await this.sftp.stat(target)
            if (stat.isDirectory) {
                await this.navigate(item.fullPath)
            } else {
                await this.download(item.fullPath, stat.mode, stat.size)
            }
        } else {
            await this.download(item.fullPath, item.mode, item.size)
        }
    }

    async upload (): Promise<void> {
        const transfers = await this.platform.startUpload({ multiple: true })
        await Promise.all(transfers.map(t => this.uploadOne(t)))
    }

    async uploadOne (transfer: FileUpload): Promise<void> {
        const itemPath = path.join(this.path, transfer.getName())
        const tempPath = itemPath + '.tabby-upload'
        const savedPath = this.path
        try {
            const handle = await this.sftp.open(tempPath, 'w')
            while (true) {
                const chunk = await transfer.read()
                if (!chunk.length) {
                    break
                }
                await handle.write(chunk)
            }
            handle.close()
            await this.sftp.rename(tempPath, itemPath)
            transfer.close()
            if (this.path === savedPath) {
                await this.navigate(this.path)
            }
        } catch (e) {
            transfer.cancel()
            this.sftp.unlink(tempPath)
            throw e
        }
    }

    async download (itemPath: string, mode: number, size: number): Promise<void> {
        const transfer = await this.platform.startDownload(path.basename(itemPath), mode, size)
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

    getModeString (item: SFTPFile): string {
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
            result += item.mode & c[i] ? s[i] : e[i]
        }
        return result
    }

    showContextMenu (item: SFTPFile, event: MouseEvent): void {
        event.preventDefault()
        this.platform.popupContextMenu([
            {
                click: async () => {
                    if ((await this.platform.showMessageBox({
                        type: 'warning',
                        message: `Delete ${item.fullPath}?`,
                        defaultId: 0,
                        buttons: ['Delete', 'Cancel'],
                    })).response === 0) {
                        await this.deleteItem(item)
                        this.navigate(this.path)
                    }
                },
                label: 'Delete',
            },
        ], event)
    }

    async deleteItem (item: SFTPFile): Promise<void> {
        const modal = this.ngbModal.open(SFTPDeleteModalComponent)
        modal.componentInstance.item = item
        modal.componentInstance.sftp = this.sftp
        await modal.result
    }

    close (): void {
        this.closed.emit()
    }
}
