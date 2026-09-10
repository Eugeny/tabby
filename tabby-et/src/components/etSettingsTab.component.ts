import { Component, HostBinding } from '@angular/core'
import { ConfigService } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './etSettingsTab.component.pug',
})
export class ETSettingsTabComponent {
    @HostBinding('class.content-box') true

    constructor (
        public config: ConfigService,
    ) { }
}
