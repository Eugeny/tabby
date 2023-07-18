import { Component } from '@angular/core'
import { PlatformService } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './colorSchemeSettingsTab.component.pug',
})
export class ColorSchemeSettingsTabComponent {
    defaultTab = 'dark'

    constructor (
        platform: PlatformService,
    ) {
        this.defaultTab = platform.getTheme()
    }
}
