/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { BaseTabComponent } from './baseTab.component'
import { ConfigService } from '../services/config.service'
import { HostWindowService } from '../api/hostWindow'

/** @hidden */
@Component({
    selector: 'welcome-page',
    template: require('./welcomeTab.component.pug'),
    styles: [require('./welcomeTab.component.scss')],
})
export class WelcomeTabComponent extends BaseTabComponent {
    enableGlobalHotkey = true

    constructor (
        private hostWindow: HostWindowService,
        public config: ConfigService,
        translate: TranslateService,
    ) {
        super()
        this.setTitle(translate.instant('Welcome'))
    }

    async closeAndDisable () {
        this.config.store.enableWelcomeTab = false
        this.config.store.pluginBlacklist = []
        if (!this.enableGlobalHotkey) {
            this.config.store.hotkeys['toggle-window'] = []
        }
        await this.config.save()
        this.hostWindow.reload()
    }
}
