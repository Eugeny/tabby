import { execFile } from 'mz/child_process'
import { Component } from '@angular/core'
import { ConfigService, ElectronService } from 'terminus-core'

/** @hidden */
@Component({
    template: require('./terminalSettingsTab.component.pug'),
})
export class TerminalSettingsTabComponent {
    constructor (
        public config: ConfigService,
        private electron: ElectronService,
    ) { }

    openWSLVolumeMixer (): void {
        this.electron.shell.openPath('sndvol.exe')
        execFile('wsl.exe', ['tput', 'bel'])
    }
}
