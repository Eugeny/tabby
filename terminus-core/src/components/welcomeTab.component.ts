/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { BaseTabComponent } from './baseTab.component'
import { ConfigService } from '../services/config.service'
import { HostAppService } from '../services/hostApp.service'

/** @hidden */
@Component({
    selector: 'welcome-page',
    template: require('./welcomeTab.component.pug'),
    styles: [require('./welcomeTab.component.scss')],
})
export class WelcomeTabComponent extends BaseTabComponent {
    enableSSH = false
    enableSerial = false

    constructor (
        private hostApp: HostAppService,
        public config: ConfigService,
    ) {
        super()
        this.setTitle('Welcome')
        this.enableSSH = !config.store.pluginBlacklist.includes('ssh')
        this.enableSerial = !config.store.pluginBlacklist.includes('serial')
    }

    closeAndDisable () {
        this.config.store.enableWelcomeTab = false
        this.config.store.pluginBlacklist = []
        if (!this.enableSSH) {
            this.config.store.pluginBlacklist.push('ssh')
        }
        if (!this.enableSerial) {
            this.config.store.pluginBlacklist.push('serial')
        }
        this.config.save()
        this.hostApp.getWindow().reload()
    }
}
