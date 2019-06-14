import { NgZone, Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { ConfigService } from 'terminus-core'
import { UACService } from './services/uac.service'
import { TerminalService } from './services/terminal.service'
import { TerminalContextMenuItemProvider } from './api/contextMenuProvider'
import { BaseTerminalTabComponent } from './api/baseTerminalTab.component'

/** @hidden */
@Injectable()
export class NewTabContextMenu extends TerminalContextMenuItemProvider {
    weight = 0

    constructor (
        public config: ConfigService,
        private zone: NgZone,
        private terminalService: TerminalService,
        private uac: UACService,
    ) {
        super()
    }

    async getItems (tab: BaseTerminalTabComponent): Promise<Electron.MenuItemConstructorOptions[]> {
        const profiles = await this.terminalService.getProfiles()

        const items: Electron.MenuItemConstructorOptions[] = [
            {
                label: 'New terminal',
                click: () => this.zone.run(() => {
                    this.terminalService.openTabWithOptions((tab as any).sessionOptions)
                }),
            },
            {
                label: 'New with profile',
                submenu: profiles.map(profile => ({
                    label: profile.name,
                    click: () => this.zone.run(async () => {
                        this.terminalService.openTab(profile, await tab.session.getWorkingDirectory())
                    }),
                })),
            },
        ]

        if (this.uac.isAvailable) {
            items.push({
                label: 'New admin tab',
                submenu: profiles.map(profile => ({
                    label: profile.name,
                    click: () => this.zone.run(async () => {
                        this.terminalService.openTabWithOptions({
                            ...profile.sessionOptions,
                            runAsAdministrator: true,
                        })
                    }),
                })),
            })
        }

        return items
    }
}

/** @hidden */
@Injectable()
export class CopyPasteContextMenu extends TerminalContextMenuItemProvider {
    weight = 1

    constructor (
        private zone: NgZone,
        private toastr: ToastrService,
    ) {
        super()
    }

    async getItems (tab: BaseTerminalTabComponent): Promise<Electron.MenuItemConstructorOptions[]> {
        return [
            {
                label: 'Copy',
                click: () => {
                    this.zone.run(() => {
                        setTimeout(() => {
                            tab.frontend.copySelection()
                            this.toastr.info('Copied')
                        })
                    })
                },
            },
            {
                label: 'Paste',
                click: () => {
                    this.zone.run(() => tab.paste())
                },
            },
        ]
    }
}
