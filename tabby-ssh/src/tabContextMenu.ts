import { Injectable } from '@angular/core'
import { BaseTabComponent, TabContextMenuItemProvider, HostAppService, Platform, MenuItemOptions, TranslateService, PlatformService, NotificationsService } from 'tabby-core'
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
        private platform: PlatformService,
        private notifications: NotificationsService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
        if (!(tab instanceof SSHTabComponent)) {
            return []
        }
        const items = [{
            label: this.translate.instant('Copy host IP'),
            click: () => {
                this.platform.setClipboard({ text: tab.profile.options.host })
                this.notifications.notice(this.translate.instant('Copied'))
            },
        }, {
            label: this.translate.instant('Open SFTP panel'),
            click: () => {
                tab.openSFTP()
            },
        }]
        if (this.hostApp.platform === Platform.Windows && this.ssh.getWinSCPPath()) {
            items.push({
                label: this.translate.instant('Launch WinSCP'),
                click: (): void => {
                    this.ssh.launchWinSCP(tab.sshSession!)
                },
            })
        }
        return items
    }
}
