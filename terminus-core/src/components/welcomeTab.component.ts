import { Component } from '@angular/core'
import { BaseTabComponent } from './baseTab.component'
import { ConfigService } from '../services/config.service'
import { AppService } from '../services/app.service'

/** @hidden */
@Component({
    selector: 'welcome-page',
    template: require('./welcomeTab.component.pug'),
    styles: [require('./welcomeTab.component.scss')],
})
export class WelcomeTabComponent extends BaseTabComponent {
    constructor (
        private app: AppService,
        public config: ConfigService,
    ) {
        super()
        this.setTitle('Welcome')
    }

    closeAndDisable () {
        this.config.store.enableWelcomeTab = false
        this.config.save()
        this.app.closeTab(this)
    }
}
