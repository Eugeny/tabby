/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'
import { BaseComponent } from './base.component'

/** @hidden */
@Component({
    selector: 'profile-icon',
    template: require('./profileIcon.component.pug'),
    styles: [require('./profileIcon.component.scss')],
})
export class ProfileIconComponent extends BaseComponent {
    @Input() icon?: string
    @Input() color?: string

    get isHTML (): boolean {
        return this.icon?.startsWith('<') ?? false
    }
}
