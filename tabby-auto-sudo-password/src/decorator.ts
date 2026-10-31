import colors from 'ansi-colors'
import { Injectable } from '@angular/core'
import { TerminalDecorator, BaseTerminalTabComponent, XTermFrontend, SessionMiddleware } from 'tabby-terminal'
import { SSHProfile, SSHTabComponent, PasswordStorageService } from 'tabby-ssh'
import { SudoPromptMatcher } from './promptMatcher'

export class AutoSudoPasswordMiddleware extends SessionMiddleware {
    private pendingPasswordToPaste: string | null = null
    private pasteHint = `${colors.black.bgBlackBright(' Tabby ')} ${colors.gray('Press Enter to paste saved password')}`
    private pasteHintLength = colors.stripColor(this.pasteHint).length
    private promptMatcher = new SudoPromptMatcher()
    private promptGeneration = 0
    private closed = false

    constructor (
        private profile: SSHProfile,
        private ps: PasswordStorageService,
    ) { super() }

    feedFromSession (data: Buffer): void {
        if (data.includes(10) || data.includes(13)) {
            this.promptGeneration++
            this.pendingPasswordToPaste = null
        }
        const username = this.promptMatcher.push(data)
        if (username !== null) {
            this.handlePrompt(username || this.profile.options.user)
        }
        this.outputToTerminal.next(data)
    }

    feedFromTerminal (data: Buffer): void {
        this.promptGeneration++
        this.promptMatcher.reset()
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
        const generation = ++this.promptGeneration
        try {
            const pw = await this.ps.loadPassword(this.profile, username)
            if (!this.closed && generation === this.promptGeneration && pw) {
                this.outputToTerminal.next(Buffer.from(this.pasteHint))
                this.pendingPasswordToPaste = pw
            }
        } catch (error) {
            console.warn('Could not load saved sudo password', error)
        }
    }

    close (): void {
        this.closed = true
        this.promptGeneration++
        this.pendingPasswordToPaste = null
        this.promptMatcher.reset()
        super.close()
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
