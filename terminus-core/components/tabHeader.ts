import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core'
import { BaseTabComponent } from 'components/baseTab'

import './tabHeader.scss'

@Component({
  selector: 'tab-header',
  template: require('./tabHeader.pug'),
  styles: [require('./tabHeader.scss')],
})
export class TabHeaderComponent {
    @Input() index: number
    @Input() @HostBinding('class.active') active: boolean
    @Input() @HostBinding('class.has-activity') hasActivity: boolean
    @Input() tab: BaseTabComponent
    @Output() closeClicked = new EventEmitter()
}
