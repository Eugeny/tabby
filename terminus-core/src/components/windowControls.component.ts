/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { HostAppService } from '../services/hostApp.service'
import { AppService } from '../services/app.service'

/** @hidden */
@Component({
    selector: 'window-controls',
    template: require('./windowControls.component.pug'),
    styles: [require('./windowControls.component.scss')],
})
export class WindowControlsComponent {
    constructor (public hostApp: HostAppService, public app: AppService) { }

    async closeWindow () {
        if (await this.app.closeAllTabs()) {
            this.hostApp.closeWindow()
        }
    }
}
