import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { MenuItemOptions, PlatformService, TranslateService } from 'tabby-core'
import { SFTPSession, SFTPFile } from './session/sftp'
import { SFTPContextMenuItemProvider } from './api'
import { SFTPDeleteModalComponent } from './components/sftpDeleteModal.component'
import { SFTPPanelComponent } from './components/sftpPanel.component'
import { SFTPCreateDirectoryModalComponent } from './components/sftpCreateDirectoryModal.component'


/** @hidden */
@Injectable()
export class CommonSFTPContextMenu extends SFTPContextMenuItemProvider {
    weight = 10

    constructor (
        private platform: PlatformService,
        private ngbModal: NgbModal,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (item: SFTPFile, panel: SFTPPanelComponent): Promise<MenuItemOptions[]> {
        return [
            {
                click: async () => {
                    await this.createDirectory(item, panel);
                },
                label: this.translate.instant('Create Directory'),
            },
            {
                click: async () => {
                    if ((await this.platform.showMessageBox({
                        type: 'warning',
                        message: this.translate.instant('Delete {fullPath}?', item),
                        defaultId: 0,
                        cancelId: 1,
                        buttons: [
                            this.translate.instant('Delete'),
                            this.translate.instant('Cancel'),
                        ],
                    })).response === 0) {
                        await this.deleteItem(item, panel.sftp)
                        panel.navigate(panel.path)
                    }
                },
                label: this.translate.instant('Delete'),
            },
        ]
    }

    async deleteItem (item: SFTPFile, session: SFTPSession): Promise<void> {
        const modal = this.ngbModal.open(SFTPDeleteModalComponent)
        modal.componentInstance.item = item
        modal.componentInstance.sftp = session
        await modal.result
    }

    async createDirectory (item: SFTPFile, panel: SFTPPanelComponent): Promise<void> {
        const modal = this.ngbModal.open(SFTPCreateDirectoryModalComponent)
        modal.componentInstance.item = item
        modal.componentInstance.sftp = panel.sftp
        modal.componentInstance.panel = panel
        await modal.result
    }
}
