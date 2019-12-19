import { Component } from '@angular/core'
import { HostAppService } from '../services/hostApp.service'

/** @hidden */
@Component({
    selector: 'title-bar',
    templateUrl: './titleBar.component.pug',
    styleUrls: ['./titleBar.component.scss'],
})
export class TitleBarComponent {
    constructor (public hostApp: HostAppService) { }
}
