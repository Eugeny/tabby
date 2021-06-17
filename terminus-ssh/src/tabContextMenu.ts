import { Injectable } from '@angular/core'
import { BaseTabComponent, TabContextMenuItemProvider, TabHeaderComponent, HostAppService, Platform, MenuItemOptions } from 'terminus-core'
import { SSHTabComponent } from './components/sshTab.component'
import { SSHService } from './services/ssh.service'


/** @hidden */
@Injectable()
export class WinSCPContextMenu extends TabContextMenuItemProvider {
    weight = 10

    constructor (
        private hostApp: HostAppService,
        private ssh: SSHService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent, _tabHeader?: TabHeaderComponent): Promise<MenuItemOptions[]> {
        if (!(tab instanceof SSHTabComponent) || !tab.connection) {
            return []
        }
        const items = [{
            label: 'Open SFTP panel',
            click: () => tab.openSFTP(),
        }]
        if (this.hostApp.platform === Platform.Windows && this.ssh.getWinSCPPath()) {
            items.push({
                label: 'Launch WinSCP',
                click: (): void => {
                    this.ssh.launchWinSCP(tab.session!)
                },
            })
        }
        return items
    }
}
