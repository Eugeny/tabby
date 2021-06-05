import { Injectable } from '@angular/core'
import { ConfigService, BaseTabComponent, TabContextMenuItemProvider, TabHeaderComponent, HostAppService, Platform, PlatformService, MenuItemOptions } from 'terminus-core'
import { SSHTabComponent } from './components/sshTab.component'
import { PasswordStorageService } from './services/passwordStorage.service'
import { SSHConnection, SSHSession } from './api'


/** @hidden */
@Injectable()
export class WinSCPContextMenu extends TabContextMenuItemProvider {
    weight = 10
    private detectedPath: string | null

    constructor (
        private hostApp: HostAppService,
        private config: ConfigService,
        private platform: PlatformService,
        private passwordStorage: PasswordStorageService,
    ) {
        super()

        if (hostApp.platform !== Platform.Windows) {
            return
        }

        this.detectedPath = platform.getWinSCPPath()
    }

    async getItems (tab: BaseTabComponent, tabHeader?: TabHeaderComponent): Promise<MenuItemOptions[]> {
        if (this.hostApp.platform !== Platform.Windows || tabHeader) {
            return []
        }
        if (!this.getPath()) {
            return []
        }
        if (!(tab instanceof SSHTabComponent) || !tab.connection) {
            return []
        }
        return [
            {
                label: 'Launch WinSCP',
                click: (): void => {
                    this.launchWinSCP(tab.session!)
                },
            },
        ]
    }

    getPath (): string|undefined {
        return this.detectedPath ?? this.config.store.ssh.winSCPPath
    }

    async getURI (connection: SSHConnection): Promise<string> {
        let uri = `scp://${connection.user}`
        const password = await this.passwordStorage.loadPassword(connection)
        if (password) {
            uri += ':' + encodeURIComponent(password)
        }
        uri += `@${connection.host}:${connection.port}/`
        return uri
    }

    async launchWinSCP (session: SSHSession): Promise<void> {
        const path = this.getPath()
        if (!path) {
            return
        }
        const args = [await this.getURI(session.connection)]
        if (session.activePrivateKey) {
            args.push('/privatekey')
            args.push(session.activePrivateKey)
        }
        this.platform.exec(path, args)
    }
}
