import { Component } from '@angular/core'
import { HostAppService } from '../services/hostApp.service'
import { AppService } from '../services/app.service'

/** @hidden */
@Component({
    selector: 'window-controls',
    templateUrl: './windowControls.component.pug',
    styleUrls: ['./windowControls.component.scss'],
})
export class WindowControlsComponent {
    constructor (public hostApp: HostAppService, public app: AppService) { }

    async closeWindow () {
        if (await this.app.closeAllTabs()) {
            this.hostApp.closeWindow()
        }
    }
}
