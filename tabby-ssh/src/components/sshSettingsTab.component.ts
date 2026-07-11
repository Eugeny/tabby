import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Component, HostBinding } from '@angular/core'
import { X11Socket } from '../session/x11'
import { ConfigService, HostAppService, Platform, TranslateService } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './sshSettingsTab.component.pug',
})
export class SSHSettingsTabComponent {
    Platform = Platform
    defaultX11Display: string
    agentTypeOptions: { value: string, name: string }[]

    @HostBinding('class.content-box') true

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        translate: TranslateService,
    ) {
        this.agentTypeOptions = [
            { value: 'auto', name: translate.instant(_('Automatic')) },
            { value: 'pageant', name: 'Pageant' },
            { value: 'pipe', name: 'Named pipe' },
        ]
        const spec = X11Socket.resolveDisplaySpec()
        if ('path' in spec) {
            this.defaultX11Display = spec.path
        } else {
            this.defaultX11Display = `${spec.host}:${spec.port}`
        }
    }
}
