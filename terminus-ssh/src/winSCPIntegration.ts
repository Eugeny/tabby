import { execFile } from 'child_process'
import { Injectable } from '@angular/core'
import { ConfigService, BaseTabComponent, TabContextMenuItemProvider, TabHeaderComponent, HostAppService, Platform } from 'terminus-core'
import { SSHTabComponent } from './components/sshTab.component'
import { PasswordStorageService } from './services/passwordStorage.service'
import { SSHConnection } from './api'


/* eslint-disable block-scoped-var */
try {
    var wnr = require('windows-native-registry') // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }


/** @hidden */
@Injectable()
export class WinSCPContextMenu extends TabContextMenuItemProvider {
    weight = 10
    private detectedPath?: string

    constructor (
        private hostApp: HostAppService,
        private config: ConfigService,
        private passwordStorage: PasswordStorageService,
    ) {
        super()

        if (hostApp.platform !== Platform.Windows) {
            return
        }

        const key = wnr.getRegistryKey(wnr.HK.CR, 'WinSCP.Url\\DefaultIcon')
        if (key?.['']) {
            this.detectedPath = key[''].value?.split(',')[0]
            this.detectedPath = this.detectedPath?.substring(1, this.detectedPath.length - 1)
        }
    }

    async getItems (tab: BaseTabComponent, tabHeader?: TabHeaderComponent): Promise<Electron.MenuItemConstructorOptions[]> {
        if (this.hostApp.platform !== Platform.Windows || tabHeader) {
            return []
        }
        if (!this.getPath()) {
            return []
        }
        if (!(tab instanceof SSHTabComponent)) {
            return []
        }
        return [
            {
                label: 'Launch WinSCP',
                click: (): void => {
                    this.launchWinSCP(tab.connection)
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

    async launchWinSCP (connection: SSHConnection): Promise<void> {
        const path = this.getPath()
        if (!path) {
            return
        }
        let args = [await this.getURI(connection)]
        if ((!connection.auth || connection.auth === 'publicKey') && connection.privateKey) {
            args.push('/privatekey')
            args.push(connection.privateKey)
        }
        execFile(path, args)
    }
}
