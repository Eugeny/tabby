import colors from 'ansi-colors'
import { Injectable } from '@angular/core'
import { TerminalDecorator, BaseTerminalTabComponent, XTermFrontend, SessionMiddleware } from 'tabby-terminal'
import { SSHProfile, SSHTabComponent, PasswordStorageService } from 'tabby-ssh'

const SUDO_PROMPT_MARKER = '[sudo'
// Multi-language sudo prompt patterns
// Each pattern captures the username in a capture group (empty for sudo-rs)
const SUDO_PROMPT_PATTERNS: RegExp[] = [
    // Traditional sudo patterns (with username)
    // English: [sudo] password for username:
    /^\[sudo\] password for ([^:]+):\s*$/im,
    // German: [sudo] Passwort für username:
    /^\[sudo\] Passwort für ([^:]+):\s*$/im,
    // French: [sudo] Mot de passe de username :
    /^\[sudo\] Mot de passe de ([^:]+)\s+:\s*$/im,
    // Spanish: [sudo] contraseña para username:
    /^\[sudo\] [Cc]ontraseña para ([^:]+):\s*$/im,
    // Portuguese: [sudo] senha para username:
    /^\[sudo\] [Ss]enha para ([^:]+):\s*$/im,
    // Italian: [sudo] password di username:
    /^\[sudo\] [Pp]assword di ([^:]+):\s*$/im,
    // Simplified Chinese: [sudo] username 的密码：
    /^\[sudo\] ([^\s]+) 的密码[：:]\s*$/im,
    // Traditional Chinese: [sudo] username 的密碼：
    /^\[sudo\] ([^\s]+) 的密碼[：:]\s*$/im,
    // Japanese: [sudo] username のパスワード:
    /^\[sudo\] ([^\s]+) のパスワード[：:]\s*$/im,
    // Korean: [sudo] username 암호:
    /^\[sudo\] ([^\s]+) 암호[：:]\s*$/im,
    // Russian: [sudo] пароль для username:
    /^\[sudo\] пароль для ([^:]+):\s*$/im,
    // Polish: [sudo] hasło użytkownika username:
    /^\[sudo\] hasło użytkownika ([^:]+):\s*$/im,
    // Turkish: [sudo] username için parola:
    /^\[sudo\] ([^\s]+) için parola:\s*$/im,
    // Czech: [sudo] heslo pro username:
    /^\[sudo\] [Hh]eslo pro ([^:]+):\s*$/im,
    // Swedish: [sudo] lösenord för username:
    /^\[sudo\] lösenord för ([^:]+):\s*$/im,
    // Danish: [sudo] adgangskode for username:
    /^\[sudo\] adgangskode for ([^:]+):\s*$/im,
    // Indonesian: [sudo] kata sandi untuk username:
    /^\[sudo\] kata sandi untuk ([^:]+):\s*$/im,
    // Ukrainian: [sudo] пароль до username:
    /^\[sudo\] пароль до ([^:]+):\s*$/im,
    // Croatian: [sudo] lozinka za username:
    /^\[sudo\] lozinka za ([^:]+):\s*$/im,

    // sudo-rs pattern (no username displayed, use empty capture group)
    // Matches: [sudo: authenticate] <password word>:
    /^\[sudo: authenticate\] .+?[：:]\s*$/im,
]

export class AutoSudoPasswordMiddleware extends SessionMiddleware {
    private pendingPasswordToPaste: string | null = null
    private pasteHint = `${colors.black.bgBlackBright(' Tabby ')} ${colors.gray('Press Enter to paste saved password')}`
    private pasteHintLength = colors.stripColor(this.pasteHint).length
    // Cache the last matched pattern index for performance optimization
    private lastMatchedPatternIndex = 0

    constructor (
        private profile: SSHProfile,
        private ps: PasswordStorageService,
    ) { super() }

    feedFromSession (data: Buffer): void {
        const text = data.toString('utf-8')
        if (!text.toLowerCase().includes(SUDO_PROMPT_MARKER)) {
            this.outputToTerminal.next(data)
            return
        }
        // Try patterns starting from the last successful match for better performance
        const patternCount = SUDO_PROMPT_PATTERNS.length
        for (let i = 0; i < patternCount; i++) {
            const idx = (this.lastMatchedPatternIndex + i) % patternCount
            const pattern = SUDO_PROMPT_PATTERNS[idx]
            const match = pattern.exec(text)
            if (match) {
                this.lastMatchedPatternIndex = idx // Remember this pattern for next time
                // For sudo-rs patterns, match[1] is undefined, use current SSH user
                const username = match[1] || this.profile.options.user
                this.handlePrompt(username)
                break
            }
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
