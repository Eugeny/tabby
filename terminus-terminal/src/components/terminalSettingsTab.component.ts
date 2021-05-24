import { execFile } from 'mz/child_process'
import { Component } from '@angular/core'
import { ConfigService, HostAppService, Platform, PlatformService } from 'terminus-core'

/** @hidden */
@Component({
    template: require('./terminalSettingsTab.component.pug'),
})
export class TerminalSettingsTabComponent {
    Platform = Platform

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        private platform: PlatformService,
    ) { }

    openWSLVolumeMixer (): void {
        this.platform.openPath('sndvol.exe')
        execFile('wsl.exe', ['tput', 'bel'])
    }
}
