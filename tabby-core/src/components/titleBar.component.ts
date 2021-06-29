import { Component } from '@angular/core'

/** @hidden */
@Component({
    selector: 'title-bar',
    template: require('./titleBar.component.pug'),
    styles: [require('./titleBar.component.scss')],
})
export class TitleBarComponent { } // eslint-disable-line @typescript-eslint/no-extraneous-class
