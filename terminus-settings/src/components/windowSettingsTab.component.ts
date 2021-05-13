/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { debounce } from 'utils-decorators/dist/cjs'
import { Component, Inject, NgZone } from '@angular/core'
import {
    DockingService,
    ConfigService,
    Theme,
    HostAppService,
    Platform,
    isWindowsBuild,
    WIN_BUILD_FLUENT_BG_SUPPORTED,
    BaseComponent,
} from 'terminus-core'


/** @hidden */
@Component({
    selector: 'window-settings-tab',
    template: require('./windowSettingsTab.component.pug'),
})
export class WindowSettingsTabComponent extends BaseComponent {
    screens: any[]
    Platform = Platform
    isFluentVibrancySupported = false

    constructor (
        public config: ConfigService,
        public docking: DockingService,
        public hostApp: HostAppService,
        public zone: NgZone,
        @Inject(Theme) public themes: Theme[],
    ) {
        super()
        this.screens = this.docking.getScreens()
        this.themes = config.enabledServices(this.themes)

        this.subscribeUntilDestroyed(hostApp.displaysChanged$, () => {
            this.zone.run(() => this.screens = this.docking.getScreens())
        })

        this.isFluentVibrancySupported = isWindowsBuild(WIN_BUILD_FLUENT_BG_SUPPORTED)
    }

    @debounce(500)
    saveConfiguration (requireRestart?: boolean) {
        this.config.save()
        if (requireRestart) {
            this.config.requestRestart()
        }
    }
}
