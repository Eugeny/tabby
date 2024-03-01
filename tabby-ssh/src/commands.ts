/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'

import { CommandProvider, Command, CommandLocation, TranslateService, CommandContext, Platform, HostAppService } from 'tabby-core'

import { SSHTabComponent } from './components/sshTab.component'
import { SSHService } from './services/ssh.service'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class SSHCommandProvider extends CommandProvider {
    constructor (
        private hostApp: HostAppService,
        private ssh: SSHService,
        private translate: TranslateService,
    ) {
        super()
    }

    async provide (context: CommandContext): Promise<Command[]> {
        const tab = context.tab
        if (!tab || !(tab instanceof SSHTabComponent)) {
            return []
        }

        const commands: Command[] = [{
            id: 'ssh:open-sftp-panel',
            group: 'ssh:sftp',
            label: this.translate.instant('Open SFTP panel'),
            locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
            run: async () => tab.openSFTP(),
        }]
        if (this.hostApp.platform === Platform.Windows && this.ssh.getWinSCPPath()) {
            commands.push({
                id: 'ssh:open-winscp',
                group: 'ssh:sftp',
                label: this.translate.instant('Launch WinSCP'),
                locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
                run: async () => this.ssh.launchWinSCP(tab.sshSession!),
            })
        }
        return commands
    }
}
