import { Inject, Injectable, Optional } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Command, CommandContext, CommandLocation, CommandProvider, PlatformService, TranslateService, HostAppService, Platform } from 'tabby-core'
import { SFTPSession, SFTPFile } from './session/sftp'
import { SFTPContextMenuItemProvider } from './api'
import { SFTPDeleteModalComponent } from './components/sftpDeleteModal.component'


/** @hidden */
@Injectable({ providedIn: 'root' })
export class CommonSFTPContextMenu extends CommandProvider {
    constructor (
        private platform: PlatformService,
        private ngbModal: NgbModal,
        private translate: TranslateService,
        private hostApp: HostAppService,
        @Optional() @Inject(SFTPContextMenuItemProvider) private legacyProviders: SFTPContextMenuItemProvider[]|null,
    ) {
        super()
    }

    async provide (context: CommandContext): Promise<Command[]> {
        const { sftpItem: item, sftpPanel: panel } = context
        if (!item || !panel) {
            return []
        }

        const commands: Command[] = [
            {
                id: 'ssh:sftp-create-directory',
                group: 'ssh:sftp-item',
                weight: 10,
                label: this.translate.instant('Create directory'),
                locations: [CommandLocation.SFTPItemMenu],
                run: async () => {
                    await panel.openCreateDirectoryModal()
                },
            },
        ]

        // Add download folder option for directories (only in electron)
        if (item.isDirectory && this.hostApp.platform !== Platform.Web) {
            commands.push({
                id: 'ssh:sftp-download-directory',
                group: 'ssh:sftp-item',
                weight: 10,
                label: this.translate.instant('Download directory'),
                locations: [CommandLocation.SFTPItemMenu],
                // Don't hold CommandService's serialized run queue for the whole transfer
                run: async () => { void panel.downloadFolder(item) },
            })
        }

        if (!item.isDirectory) {
            commands.push({
                id: 'ssh:sftp-download',
                group: 'ssh:sftp-item',
                weight: 10,
                label: this.translate.instant('Download'),
                locations: [CommandLocation.SFTPItemMenu],
                run: async () => { void panel.downloadItem(item) },
            })
        }

        commands.push({
            id: 'ssh:sftp-delete',
            group: 'ssh:sftp-item',
            weight: 10,
            label: this.translate.instant('Delete'),
            locations: [CommandLocation.SFTPItemMenu],
            run: async () => {
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
        })

        // Deprecated SFTPContextMenuItemProvider bridge
        for (const [index, provider] of (this.legacyProviders ?? []).entries()) {
            for (const menuItem of await provider.getItems(item, panel)) {
                commands.push(...Command.fromMenuItem(menuItem).map(command => ({
                    ...command,
                    group: `legacy:sftp-item:${index}`,
                    weight: provider.weight,
                    locations: [CommandLocation.SFTPItemMenu],
                })))
            }
        }

        return commands
    }

    async deleteItem (item: SFTPFile, session: SFTPSession): Promise<void> {
        const modal = this.ngbModal.open(SFTPDeleteModalComponent)
        modal.componentInstance.item = item
        modal.componentInstance.sftp = session
        await modal.result.catch(() => null)
    }
}
