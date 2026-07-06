/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { debounce } from 'utils-decorators/dist/esm/debounce/debounce'
import { Component, HostBinding, Inject, NgZone, Optional } from '@angular/core'
import {
    DockingService,
    ConfigService,
    Theme,
    HostAppService,
    Platform,
    isWindowsBuild,
    WIN_BUILD_FLUENT_BG_SUPPORTED,
    BaseComponent,
    Screen,
    PlatformService,
    TranslateService,
} from 'tabby-core'


/** @hidden */
@Component({
    selector: 'window-settings-tab',
    templateUrl: './windowSettingsTab.component.pug',
})
export class WindowSettingsTabComponent extends BaseComponent {
    screens: Screen[]
    Platform = Platform
    isFluentVibrancySupported = false
    themeOptions: { value: any, name: string }[] = []

    @HostBinding('class.content-box') true

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        public platform: PlatformService,
        public zone: NgZone,
        translate: TranslateService,
        @Inject(Theme) public themes: Theme[],
        @Optional() public docking?: DockingService,
    ) {
        super()

        this.themes = config.enabledServices(this.themes)
        this.themeOptions = this.themes.map(theme => ({ value: theme.name, name: translate.instant(theme.name) }))

        const dockingService = docking
        if (dockingService) {
            this.subscribeUntilDestroyed(dockingService.screensChanged$, () => {
                this.zone.run(() => this.screens = dockingService.getScreens())
            })
            this.screens = dockingService.getScreens()
        }

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
