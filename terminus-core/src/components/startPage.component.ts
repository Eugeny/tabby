import * as os from 'os'
import { Component, Inject } from '@angular/core'
import { ElectronService } from '../services/electron.service'
import { IToolbarButton, ToolbarButtonProvider } from '../api'

@Component({
    selector: 'start-page',
    template: require('./startPage.component.pug'),
    styles: [require('./startPage.component.scss')],
})
export class StartPageComponent {
    version: string

    constructor (
        private electron: ElectronService,
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
    ) {
        this.version = electron.app.getVersion()
    }

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
        let body = `Version: ${this.version}\n`
        body += `Platform: ${os.platform()} ${os.release()}\n\n`
        let label = {
            darwin: 'macOS',
            windows: 'Windows',
            linux: 'Linux',
        }[os.platform()]
        this.electron.shell.openExternal(`https://github.com/eugeny/terminus/issues/new?body=${encodeURIComponent(body)}&labels=${label}`)
    }
}
