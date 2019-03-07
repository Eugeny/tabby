import { NgZone, Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { ConfigService } from 'terminus-core'
import { UACService } from './services/uac.service'
import { TerminalService } from './services/terminal.service'
import { BaseTerminalTabComponent } from './components/baseTerminalTab.component'
import { TerminalContextMenuItemProvider } from './api'

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
        let shells = await this.terminalService.shells$.toPromise()

        let items: Electron.MenuItemConstructorOptions[] = [
            {
                label: 'New terminal',
                click: () => this.zone.run(() => {
                    this.terminalService.openTabWithOptions((tab as any).sessionOptions)
                })
            },
            {
                label: 'New with shell',
                submenu: shells.map(shell => ({
                    label: shell.name,
                    click: () => this.zone.run(async () => {
                        this.terminalService.openTab(shell, await tab.session.getWorkingDirectory())
                    }),
                })),
            },
        ]

        if (this.uac.isAvailable) {
            items.push({
                label: 'New as admin',
                submenu: shells.map(shell => ({
                    label: shell.name,
                    click: () => this.zone.run(async () => {
                        let options = this.terminalService.optionsFromShell(shell)
                        options.runAsAdministrator = true
                        this.terminalService.openTabWithOptions(options)
                    }),
                })),
            })
        }

        items = items.concat([
            {
                label: 'New with profile',
                submenu: this.config.store.terminal.profiles.length ? this.config.store.terminal.profiles.map(profile => ({
                    label: profile.name,
                    click: () => this.zone.run(() => {
                        this.terminalService.openTabWithOptions(profile.sessionOptions)
                    }),
                })) : [{
                    label: 'No profiles saved',
                    enabled: false,
                }],
            },
        ])

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
                }
            },
            {
                label: 'Paste',
                click: () => {
                    this.zone.run(() => tab.paste())
                }
            },
        ]
    }
}
