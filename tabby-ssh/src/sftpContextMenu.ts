import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { MenuItemOptions, PlatformService } from 'tabby-core'
import { SFTPSession, SFTPFile } from './session/sftp'
import { SFTPContextMenuItemProvider } from './api'
import { SFTPDeleteModalComponent } from './components/sftpDeleteModal.component'
import { SFTPPanelComponent } from './components/sftpPanel.component'


/** @hidden */
@Injectable()
export class CommonSFTPContextMenu extends SFTPContextMenuItemProvider {
    weight = 10

    constructor (
        private platform: PlatformService,
        private ngbModal: NgbModal,
    ) {
        super()
    }

    async getItems (item: SFTPFile, panel: SFTPPanelComponent): Promise<MenuItemOptions[]> {
        return [
            {
                click: async () => {
                    if ((await this.platform.showMessageBox({
                        type: 'warning',
                        message: `Delete ${item.fullPath}?`,
                        defaultId: 0,
                        cancelId: 1,
                        buttons: ['Delete', 'Cancel'],
                    })).response === 0) {
                        await this.deleteItem(item, panel.sftp)
                        panel.navigate(panel.path)
                    }
                },
                label: 'Delete',
            },
        ]
    }

    async deleteItem (item: SFTPFile, session: SFTPSession): Promise<void> {
        const modal = this.ngbModal.open(SFTPDeleteModalComponent)
        modal.componentInstance.item = item
        modal.componentInstance.sftp = session
        await modal.result
    }
}
