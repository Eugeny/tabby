import { Component } from '@angular/core'
import { HostAppService } from 'services/hostApp'

@Component({
  selector: 'title-bar',
  template: require('./titleBar.pug'),
  styles: [require('./titleBar.scss')],
})
export class TitleBarComponent {
    constructor (public hostApp: HostAppService) {
    }
}
