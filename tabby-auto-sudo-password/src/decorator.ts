import colors from 'ansi-colors'
import { Injectable } from '@angular/core'
import { TerminalDecorator, BaseTerminalTabComponent, XTermFrontend, SessionMiddleware } from 'tabby-terminal'
import { SSHProfile, SSHTabComponent, PasswordStorageService } from 'tabby-ssh'

const SUDO_PROMPT_REGEX = /^\[sudo\] password for ([^:]+):\s*$/im

export class AutoSudoPasswordMiddleware extends SessionMiddleware {
    private pendingPasswordToPaste: string | null = null
    private pasteHint = `${colors.black.bgBlackBright(' Tabby ')} ${colors.gray('Press Enter to paste saved password')}`
    private pasteHintLength = colors.stripColor(this.pasteHint).length

    constructor (
        private profile: SSHProfile,
        private ps: PasswordStorageService,
    ) { super() }

    feedFromSession (data: Buffer): void {
        const text = data.toString('utf-8')
        const match = SUDO_PROMPT_REGEX.exec(text)
        if (match) {
            const username = match[1]
            this.handlePrompt(username)
        }
        this.outputToTerminal.next(data)
    }

    feedFromTerminal (data: Buffer): void {
        if (this.pendingPasswordToPaste) {
            const backspaces = Buffer.alloc(this.pasteHintLength, 8) // backspace
            const spaces = Buffer.alloc(this.pasteHintLength, 32) // space
            const clear = Buffer.concat([backspaces, spaces, backspaces])
            this.outputToTerminal.next(clear)
            if (data.length === 1 && data[0] === 13) { // Enter key
                this.outputToSession.next(Buffer.from(this.pendingPasswordToPaste + '\n'))
                this.pendingPasswordToPaste = null
                return
            } else {
                this.pendingPasswordToPaste = null
            }
        }
        this.outputToSession.next(data)
    }

    async handlePrompt (username: string): Promise<void> {
        console.log(`Detected sudo prompt for user: ${username}`)
        const pw = await this.ps.loadPassword(this.profile, username)
        if (pw) {
            this.outputToTerminal.next(Buffer.from(this.pasteHint))
            this.pendingPasswordToPaste = pw
        }
    }

    async loadPassword (username: string): Promise<string| null> {
        if (this.profile.options.user !== username) {
            return null
        }
        return this.ps.loadPassword(this.profile, username)
    }
}

@Injectable()
export class AutoSudoPasswordDecorator extends TerminalDecorator {
    constructor (
        private ps: PasswordStorageService,
    ) {
        super()
    }

    private attachToSession (tab: SSHTabComponent) {
        if (!tab.session) {
            return
        }
        tab.session.middleware.unshift(new AutoSudoPasswordMiddleware(tab.profile, this.ps))
    }

    attach (tab: BaseTerminalTabComponent<any>): void {
        if (!(tab.frontend instanceof XTermFrontend) || !(tab instanceof SSHTabComponent)) {
            return
        }

        setTimeout(() => {
            this.attachToSession(tab)
            this.subscribeUntilDetached(tab, tab.sessionChanged$.subscribe(() => {
                this.attachToSession(tab)
            }))
        })
    }
}
