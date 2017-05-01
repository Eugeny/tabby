import { Component } from '@angular/core'

@Component({
    selector: 'title-bar',
    template: require('./titleBar.component.pug'),
    styles: [require('./titleBar.component.scss')],
})
export class TitleBarComponent { }
