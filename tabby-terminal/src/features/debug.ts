import { Injectable } from '@angular/core'
import { HotkeysService, PlatformService } from 'tabby-core'
import { TerminalDecorator } from '../api/decorator'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'

/** @hidden */
@Injectable()
export class DebugDecorator extends TerminalDecorator {
    constructor (
        private hotkeys: HotkeysService,
        private platform: PlatformService,
    ) {
        super()
    }

    attach (terminal: BaseTerminalTabComponent<any>): void {
        let sessionOutputBuffer = ''
        const bufferLength = 8192

        const handler = data => {
            sessionOutputBuffer += data
            if (sessionOutputBuffer.length > bufferLength) {
                sessionOutputBuffer = sessionOutputBuffer.substring(sessionOutputBuffer.length - bufferLength)
            }
        }
        this.subscribeUntilDetached(terminal, terminal.sessionChanged$.subscribe(session => {
            this.subscribeUntilDetached(terminal, session?.output$.subscribe(handler))
        }))

        this.subscribeUntilDetached(terminal, terminal.session?.output$.subscribe(handler))

        this.subscribeUntilDetached(terminal, this.hotkeys.hotkey$.subscribe(hotkey => {
            if (!terminal.hasFocus) {
                return
            }
            switch (hotkey) {
                case 'debug-save-state':
                    this.doSaveState(terminal)
                    break
                case 'debug-load-state':
                    void this.doLoadState(terminal)
                    break
                case 'debug-copy-state':
                    void this.doCopyState(terminal)
                    break
                case 'debug-paste-state':
                    void this.doPasteState(terminal)
                    break
                case 'debug-save-output':
                    this.doSaveOutput(sessionOutputBuffer)
                    break
                case 'debug-load-output':
                    void this.doLoadOutput(terminal)
                    break
                case 'debug-copy-output':
                    void this.doCopyOutput(sessionOutputBuffer)
                    break
                case 'debug-paste-output':
                    void this.doPasteOutput(terminal)
                    break
            }
        }))
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

    private doSaveState (terminal: BaseTerminalTabComponent<any>) {
        this.saveFile(terminal.frontend!.saveState(), 'state.txt')
    }

    private async doCopyState (terminal: BaseTerminalTabComponent<any>) {
        const data = '```' + JSON.stringify(terminal.frontend!.saveState()) + '```'
        this.platform.setClipboard({ text: data })
    }

    private async doLoadState (terminal: BaseTerminalTabComponent<any>) {
        const data = await this.loadFile()
        if (data) {
            terminal.frontend!.restoreState(data)
        }
    }

    private async doPasteState (terminal: BaseTerminalTabComponent<any>) {
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

    private async doLoadOutput (terminal: BaseTerminalTabComponent<any>) {
        const data = await this.loadFile()
        if (data) {
            await terminal.frontend?.write(data)
        }
    }

    private async doPasteOutput (terminal: BaseTerminalTabComponent<any>) {
        let data = this.platform.readClipboard()
        if (data) {
            if (data.startsWith('`')) {
                data = data.substring(3, data.length - 3)
            }
            await terminal.frontend?.write(JSON.parse(data))
        }
    }
}
