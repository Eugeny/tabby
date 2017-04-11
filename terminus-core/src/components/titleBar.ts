import { Component, HostBinding } from '@angular/core'
import { HostAppService, Platform } from '../services/hostApp'

@Component({
  selector: 'title-bar',
  template: require('./titleBar.pug'),
  styles: [require('./titleBar.scss')],
})
export class TitleBarComponent {
    @HostBinding('class.inset-titlebar') insetTitlebar = false

    constructor (public hostApp: HostAppService) {
        this.insetTitlebar = hostApp.platform == Platform.macOS
    }
}
