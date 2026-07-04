import { Component } from '@angular/core'
import { ConfigService, PlatformService } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './colorSchemeSettingsTab.component.pug',
})
export class ColorSchemeSettingsTabComponent {
    defaultTab = 'dark'

    constructor (
        platform: PlatformService,
        public config: ConfigService,
    ) {
        const mode = this.config.store.appearance.colorSchemeMode
        if (mode === 'dark' || mode === 'light') {
            this.defaultTab = mode
        } else {
            this.defaultTab = platform.getTheme()
        }
    }
}
