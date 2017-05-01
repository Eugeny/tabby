import { Component, Inject } from '@angular/core'
import { ElectronService } from '../services/electron.service'
import { IToolbarButton, ToolbarButtonProvider } from '../api'

@Component({
    selector: 'start-page',
    template: require('./startPage.component.pug'),
    styles: [require('./startPage.component.scss')],
})
export class StartPageComponent {
    constructor (
        private electron: ElectronService,
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
    ) { }

    getButtons (): IToolbarButton[] {
        return this.toolbarButtonProviders
            .map(provider => provider.provide())
            .reduce((a, b) => a.concat(b))
            .sort((a: IToolbarButton, b: IToolbarButton) => (a.weight || 0) - (b.weight || 0))
    }

    openGitHub () {
        this.electron.shell.openExternal('https://github.com/eugeny/terminus')
    }

    reportBug () {
        this.electron.shell.openExternal('https://github.com/eugeny/terminus/issues/new')
    }
}
