import { StringDecoder } from 'string_decoder'

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

const MAX_PROMPT_LENGTH = 4096

/** Match only the current output line, across transport and UTF-8 boundaries. */
export class SudoPromptMatcher {
    private decoder = new StringDecoder('utf8')
    private text = ''
    private overlongLine = false
    private lastMatchedPatternIndex = 0

    push (data: Buffer): string|null {
        const text = this.decoder.write(data)
        const lineBreak = Math.max(text.lastIndexOf('\n'), text.lastIndexOf('\r'))
        const tail = lineBreak >= 0 ? text.slice(lineBreak + 1) : text
        if (lineBreak >= 0) {
            this.text = ''
            this.overlongLine = false
        }
        if (this.overlongLine || this.text.length + tail.length > MAX_PROMPT_LENGTH) {
            this.text = ''
            this.overlongLine = true
            return null
        }
        this.text += tail
        if (!this.text.toLowerCase().includes(SUDO_PROMPT_MARKER)) {
            return null
        }
        for (let i = 0; i < SUDO_PROMPT_PATTERNS.length; i++) {
            const index = (this.lastMatchedPatternIndex + i) % SUDO_PROMPT_PATTERNS.length
            const match = SUDO_PROMPT_PATTERNS[index].exec(this.text)
            if (match) {
                this.lastMatchedPatternIndex = index
                this.text = ''
                return match[1] || ''
            }
        }
        return null
    }

    reset (): void {
        this.decoder = new StringDecoder('utf8')
        this.text = ''
        this.overlongLine = false
    }
}
