/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { HostWindowService } from '../api/hostWindow'
import { AppService } from '../services/app.service'

/** @hidden */
@Component({
    selector: 'window-controls',
    template: require('./windowControls.component.pug'),
    styles: [require('./windowControls.component.scss')],
})
export class WindowControlsComponent {
    constructor (public hostWindow: HostWindowService, public app: AppService) { }

    async closeWindow () {
        this.app.closeWindow()
    }
}
