import { Injectable } from '@angular/core'
import { BaseTabComponent, TabContextMenuItemProvider, HostAppService, Platform, MenuItemOptions, TranslateService, ContextMenuItemDefinitionProvider, ContextMenuItemDefinition } from 'tabby-core'
import { SSHTabComponent } from './components/sshTab.component'
import { SSHService } from './services/ssh.service'


/** @hidden */
@Injectable()
export class SFTPContextMenu extends TabContextMenuItemProvider {
    weight = 10

    constructor (
        private hostApp: HostAppService,
        private ssh: SSHService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
        if (!(tab instanceof SSHTabComponent)) {
            return []
        }
        const items = [{
            id: 'open-sftp-panel',
            label: this.translate.instant('Open SFTP panel'),
            click: () => {
                tab.openSFTP()
            },
        }]
        if (this.hostApp.platform === Platform.Windows && this.ssh.getWinSCPPath()) {
            items.push({
                id: 'launch-winscp',
                label: this.translate.instant('Launch WinSCP'),
                click: (): void => {
                    this.ssh.launchWinSCP(tab.sshSession!)
                },
            })
        }
        return items
    }
}

/** @hidden */
@Injectable()
export class SSHContextMenuItemDefinitions extends ContextMenuItemDefinitionProvider {
    constructor (private translate: TranslateService) {
        super()
    }

    getItems (): ContextMenuItemDefinition[] {
        // Weight mirrors SFTPContextMenu's real `weight = 10`.
        return [
            { id: 'open-sftp-panel', name: this.translate.instant('Open SFTP panel'), weight: 10 },
            { id: 'launch-winscp', name: this.translate.instant('Launch WinSCP'), weight: 10 },
        ]
    }
}
