import { Component, Inject } from '@angular/core'
import { IToolbarButton, ToolbarButtonProvider } from '../api'

@Component({
  selector: 'start-page',
  template: require('./startPage.pug'),
  styles: [require('./startPage.scss')],
})
export class StartPageComponent {
    constructor(
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
    ) { }

    getButtons (): IToolbarButton[] {
        return this.toolbarButtonProviders
            .map(provider => provider.provide())
            .reduce((a, b) => a.concat(b))
            .sort((a: IToolbarButton, b: IToolbarButton) => (a.weight || 0) - (b.weight || 0))
    }
}
