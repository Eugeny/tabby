import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { MenuItemOptions, PlatformService, TranslateService, HostAppService, Platform } from 'tabby-core'
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
        private translate: TranslateService,
        private hostApp: HostAppService,
    ) {
        super()
    }

    async getItems (item: SFTPFile, panel: SFTPPanelComponent): Promise<MenuItemOptions[]> {
        const items: MenuItemOptions[] = []

        // Add download folder option for directories (only in electron)
        if (item.isDirectory && this.hostApp.platform !== Platform.Web) {
            items.push({
                click: () => this.downloadFolder(item, panel),
                label: this.translate.instant('Download directory'),
            })
        }

        if (!item.isDirectory) {
            items.push({
                click: () => this.downloadItem(item, panel),
                label: this.translate.instant('Download'),
            })
        }

        items.push({
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
                    if (panel.sftp) {
                        await this.deleteItem(item, panel.sftp)
                        this.refreshPanel(panel)
                    }
                }
            },
            label: this.translate.instant('Delete'),
        })

        return items
    }

    async deleteItem (item: SFTPFile, session: SFTPSession): Promise<void> {
        const modal = this.ngbModal.open(SFTPDeleteModalComponent)
        modal.componentInstance.item = item
        modal.componentInstance.sftp = session
        await modal.result.catch(() => null)
    }

    downloadFolder (item: SFTPFile, panel: SFTPPanelComponent): void {
        // TODO: Implement folder download functionality
        console.log('Download folder:', item)
    }

    downloadItem (item: SFTPFile, panel: SFTPPanelComponent): void {
        // TODO: Implement item download functionality
        console.log('Download item:', item)
    }

    refreshPanel (panel: SFTPPanelComponent): void {
        // TODO: Implement panel refresh functionality
        console.log('Refresh panel')
    }
}
