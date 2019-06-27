import { Injectable, NgZone } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { ConfigService, BaseTabComponent, TabContextMenuItemProvider } from 'terminus-core'
import { TerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable()
export class SaveAsProfileContextMenu extends TabContextMenuItemProvider {
    constructor (
        private config: ConfigService,
        private zone: NgZone,
        private toastr: ToastrService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<Electron.MenuItemConstructorOptions[]> {
        if (!(tab instanceof TerminalTabComponent)) {
            return []
        }
        return [
            {
                label: 'Save as profile',
                click: () => this.zone.run(async () => {
                    const profile = {
                        sessionOptions: {
                            ...tab.sessionOptions,
                            cwd: await tab.session.getWorkingDirectory() || tab.sessionOptions.cwd,
                        },
                        name: tab.sessionOptions.command,
                    }
                    this.config.store.terminal.profiles = [
                        ...this.config.store.terminal.profiles,
                        profile,
                    ]
                    this.config.save()
                    this.toastr.info('Saved')
                }),
            },
        ]
    }
}
