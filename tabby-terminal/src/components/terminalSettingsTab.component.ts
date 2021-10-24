import { Component, HostBinding } from '@angular/core'
import { ConfigService, HostAppService, Platform, PlatformService } from 'tabby-core'

/** @hidden */
@Component({
    template: require('./terminalSettingsTab.component.pug'),
})
export class TerminalSettingsTabComponent {
    Platform = Platform

    @HostBinding('class.content-box') true

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        private platform: PlatformService,
    ) { }

    openWSLVolumeMixer (): void {
        this.platform.openPath('sndvol.exe')
        this.platform.exec('wsl.exe', ['tput', 'bel'])
    }
}
