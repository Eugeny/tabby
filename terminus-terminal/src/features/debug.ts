import * as fs from 'fs'
import { Injectable } from '@angular/core'
import { TerminalDecorator } from '../api/decorator'
import { TerminalTabComponent } from '../components/terminalTab.component'
import { ElectronService, HostAppService } from 'terminus-core'

/** @hidden */
@Injectable()
export class DebugDecorator extends TerminalDecorator {
    constructor (
        private electron: ElectronService,
        private hostApp: HostAppService,
    ) {
        super()
    }

    attach (terminal: TerminalTabComponent): void {
        terminal.content.nativeElement.addEventListener('keyup', e => {
            if (e.which === 49 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doSaveOutput(terminal)
            }
            if (e.which === 50 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doLoadInput(terminal)
            }
            if (e.which === 51 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doCopyOutput(terminal)
            }
            if (e.which === 52 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doPasteOutput(terminal)
            }
        })
    }

    async doSaveOutput (terminal: TerminalTabComponent) {
        const result = await this.electron.dialog.showSaveDialog(
            this.hostApp.getWindow(),
            {
                defaultPath: 'output.txt',
            },
        )
        if (result.filePath) {
            fs.writeFileSync(result.filePath, terminal.frontend.saveState())
        }
    }

    async doCopyOutput (terminal: TerminalTabComponent) {
        const data = '```' + JSON.stringify(terminal.frontend.saveState()) + '```'
        this.electron.clipboard.writeText(data)
    }

    async doLoadInput (terminal: TerminalTabComponent) {
        const result = await this.electron.dialog.showOpenDialog(
            this.hostApp.getWindow(),
            {
                buttonLabel: 'Load',
                properties: ['openFile', 'treatPackageAsDirectory'],
            },
        )
        if (result.filePaths.length) {
            const data = fs.readFileSync(result.filePaths[0])
            terminal.frontend.restoreState(data)
        }
    }

    async doPasteOutput (terminal: TerminalTabComponent) {
        const data = JSON.parse(this.electron.clipboard.readText())
        terminal.frontend.restoreState(data)
    }
}
