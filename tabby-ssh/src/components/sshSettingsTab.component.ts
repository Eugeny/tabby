import { Component } from '@angular/core'
import { ConfigService, HostAppService, Platform } from 'tabby-core'

/** @hidden */
@Component({
    template: require('./sshSettingsTab.component.pug'),
})
export class SSHSettingsTabComponent {
    Platform = Platform

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
    ) { }
}
