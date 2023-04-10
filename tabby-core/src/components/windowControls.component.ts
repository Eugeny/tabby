/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { HostWindowService } from '../api/hostWindow'
import { AppService } from '../services/app.service'

/** @hidden */
@Component({
    selector: 'window-controls',
    templateUrl: './windowControls.component.pug',
    styleUrls: ['./windowControls.component.scss'],
})
export class WindowControlsComponent {
    constructor (public hostWindow: HostWindowService, public app: AppService) { }

    async closeWindow () {
        this.app.closeWindow()
    }
}
