import shellQuote from 'shell-quote'
import { Injectable } from '@angular/core'
import { CLIHandler, CLIEvent, AppService, HostWindowService } from 'tabby-core'
import { BaseTerminalTabComponent } from './api/baseTerminalTab.component'

@Injectable()
export class TerminalCLIHandler extends CLIHandler {
    firstMatchOnly = true
    priority = 0

    constructor (
        private app: AppService,
        private hostWindow: HostWindowService,
    ) {
        super()
    }

    async handle (event: CLIEvent): Promise<boolean> {
        const op = event.argv._[0]

        if (op === 'paste') {
            let text = event.argv.text
            if (event.argv.escape) {
                text = shellQuote.quote([text])
            }
            this.handlePaste(text)
            return true
        }

        return false
    }

    private handlePaste (text: string) {
        if (this.app.activeTab instanceof BaseTerminalTabComponent && this.app.activeTab.session) {
            this.app.activeTab.sendInput(text)
            this.hostWindow.bringToFront()
        }
    }
}
