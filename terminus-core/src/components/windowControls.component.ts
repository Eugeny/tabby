import { Component } from '@angular/core'
import { HostAppService } from '../services/hostApp.service'

@Component({
    selector: 'window-controls',
    template: require('./windowControls.component.pug'),
    styles: [require('./windowControls.component.scss')],
})
export class WindowControlsComponent {
    constructor (public hostApp: HostAppService) { }
}
