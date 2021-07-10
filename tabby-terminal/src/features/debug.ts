import { Injectable } from '@angular/core'
import { TerminalDecorator } from '../api/decorator'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'
import { PlatformService } from 'tabby-core'

/** @hidden */
@Injectable()
export class DebugDecorator extends TerminalDecorator {
    constructor (
        private platform: PlatformService,
    ) {
        super()
    }

    attach (terminal: BaseTerminalTabComponent): void {
        let sessionOutputBuffer = ''
        const bufferLength = 8192

        this.subscribeUntilDetached(terminal, terminal.session!.output$.subscribe(data => {
            sessionOutputBuffer += data
            if (sessionOutputBuffer.length > bufferLength) {
                sessionOutputBuffer = sessionOutputBuffer.substring(sessionOutputBuffer.length - bufferLength)
            }
        }))

        terminal.addEventListenerUntilDestroyed(terminal.content.nativeElement, 'keyup', (e: KeyboardEvent) => {
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
        const transfer = await this.platform.startUpload()
        if (!transfer.length) {
            return null
        }
        const data = await transfer[0].readAll()
        transfer[0].close()
        return data.toString()
    }

    private async saveFile (content: string, name: string) {
        const data = Buffer.from(content)
        const transfer = await this.platform.startDownload(name, 0o644, data.length)
        if (transfer) {
            transfer.write(data)
            transfer.close()
        }
    }

    private doSaveState (terminal: BaseTerminalTabComponent) {
        this.saveFile(terminal.frontend!.saveState(), 'state.txt')
    }

    private async doCopyState (terminal: BaseTerminalTabComponent) {
        const data = '```' + JSON.stringify(terminal.frontend!.saveState()) + '```'
        this.platform.setClipboard({ text: data })
    }

    private async doLoadState (terminal: BaseTerminalTabComponent) {
        const data = await this.loadFile()
        if (data) {
            terminal.frontend!.restoreState(data)
        }
    }

    private async doPasteState (terminal: BaseTerminalTabComponent) {
        let data = this.platform.readClipboard()
        if (data) {
            if (data.startsWith('`')) {
                data = data.substring(3, data.length - 3)
            }
            terminal.frontend!.restoreState(JSON.parse(data))
        }
    }

    private doSaveOutput (buffer: string) {
        this.saveFile(buffer, 'output.txt')
    }

    private async doCopyOutput (buffer: string) {
        const data = '```' + JSON.stringify(buffer) + '```'
        this.platform.setClipboard({ text: data })
    }

    private async doLoadOutput (terminal: BaseTerminalTabComponent) {
        const data = await this.loadFile()
        if (data) {
            terminal.frontend?.write(data)
        }
    }

    private async doPasteOutput (terminal: BaseTerminalTabComponent) {
        let data = this.platform.readClipboard()
        if (data) {
            if (data.startsWith('`')) {
                data = data.substring(3, data.length - 3)
            }
            terminal.frontend?.write(JSON.parse(data))
        }
    }
}
