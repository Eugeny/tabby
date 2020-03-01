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
        let sessionOutputBuffer = ''
        const bufferLength = 8192

        this.subscribeUntilDetached(terminal, terminal.session.output$.subscribe(data => {
            sessionOutputBuffer += data
            if (sessionOutputBuffer.length > bufferLength) {
                sessionOutputBuffer = sessionOutputBuffer.substring(sessionOutputBuffer.length - bufferLength)
            }
        }))

        terminal.content.nativeElement.addEventListener('keyup', e => {
            // Ctrl-Shift-Alt-1
            if (e.which === 49 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doSaveState(terminal)
            }
            // Ctrl-Shift-Alt-2
            if (e.which === 50 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doLoadState(terminal)
            }
            // Ctrl-Shift-Alt-3
            if (e.which === 51 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doCopyState(terminal)
            }
            // Ctrl-Shift-Alt-4
            if (e.which === 52 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doPasteState(terminal)
            }
            // Ctrl-Shift-Alt-5
            if (e.which === 53 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doSaveOutput(sessionOutputBuffer)
            }
            // Ctrl-Shift-Alt-6
            if (e.which === 54 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doLoadOutput(terminal)
            }
            // Ctrl-Shift-Alt-7
            if (e.which === 55 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doCopyOutput(sessionOutputBuffer)
            }
            // Ctrl-Shift-Alt-8
            if (e.which === 56 && e.ctrlKey && e.shiftKey && e.altKey) {
                this.doPasteOutput(terminal)
            }
        })
    }

    private async loadFile (): Promise<string|null> {
        const result = await this.electron.dialog.showOpenDialog(
            this.hostApp.getWindow(),
            {
                buttonLabel: 'Load',
                properties: ['openFile', 'treatPackageAsDirectory'],
            },
        )
        if (result.filePaths.length) {
            return fs.readFileSync(result.filePaths[0], { encoding: 'utf-8' })
        }
        return null
    }

    private async saveFile (content: string, name: string) {
        const result = await this.electron.dialog.showSaveDialog(
            this.hostApp.getWindow(),
            {
                defaultPath: name,
            },
        )
        if (result.filePath) {
            fs.writeFileSync(result.filePath, content)
        }
    }

    private doSaveState (terminal: TerminalTabComponent) {
        this.saveFile(terminal.frontend.saveState(), 'state.txt')
    }

    private async doCopyState (terminal: TerminalTabComponent) {
        const data = '```' + JSON.stringify(terminal.frontend.saveState()) + '```'
        this.electron.clipboard.writeText(data)
    }

    private async doLoadState (terminal: TerminalTabComponent) {
        const data = await this.loadFile()
        if (data) {
            terminal.frontend.restoreState(data)
        }
    }

    private async doPasteState (terminal: TerminalTabComponent) {
        let data = this.electron.clipboard.readText()
        if (data) {
            if (data.startsWith('`')) {
                data = data.substring(3, data.length - 3)
            }
            terminal.frontend.restoreState(JSON.parse(data))
        }
    }

    private doSaveOutput (buffer: string) {
        this.saveFile(buffer, 'output.txt')
    }

    private async doCopyOutput (buffer: string) {
        const data = '```' + JSON.stringify(buffer) + '```'
        this.electron.clipboard.writeText(data)
    }

    private async doLoadOutput (terminal: TerminalTabComponent) {
        const data = await this.loadFile()
        if (data) {
            terminal.frontend.write(data)
        }
    }

    private async doPasteOutput (terminal: TerminalTabComponent) {
        let data = this.electron.clipboard.readText()
        if (data) {
            if (data.startsWith('`')) {
                data = data.substring(3, data.length - 3)
            }
            terminal.frontend.write(JSON.parse(data))
        }
    }
}
