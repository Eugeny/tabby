import { Component, HostBinding } from '@angular/core'
import { HostAppService, Platform } from '../services/hostApp.service'

@Component({
  selector: 'title-bar',
  template: require('./titleBar.component.pug'),
  styles: [require('./titleBar.component.scss')],
})
export class TitleBarComponent {
    @HostBinding('class.inset-titlebar') insetTitlebar = false

    constructor (public hostApp: HostAppService) {
        this.insetTitlebar = hostApp.platform == Platform.macOS
    }
}
