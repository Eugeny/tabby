import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core'
import { Tab } from 'api/tab'

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
    @Input() model: Tab
    @Output() closeClicked = new EventEmitter()
}
