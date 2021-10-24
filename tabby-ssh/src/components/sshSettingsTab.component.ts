import { Component, HostBinding } from '@angular/core'
import { X11Socket } from '../session/x11'
import { ConfigService, HostAppService, Platform } from 'tabby-core'

/** @hidden */
@Component({
    template: require('./sshSettingsTab.component.pug'),
})
export class SSHSettingsTabComponent {
    Platform = Platform
    defaultX11Display: string

    @HostBinding('class.content-box') true

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
    ) {
        const spec = X11Socket.resolveDisplaySpec()
        if ('path' in spec) {
            this.defaultX11Display = spec.path
        } else {
            this.defaultX11Display = `${spec.host}:${spec.port}`
        }
    }
}
