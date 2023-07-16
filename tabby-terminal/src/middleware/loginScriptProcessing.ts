import deepClone from 'clone-deep'
import { Logger } from 'tabby-core'
import { SessionMiddleware } from '../api/middleware'

export interface LoginScript {
    expect: string
    send: string
    isRegex?: boolean
    optional?: boolean
}

export interface LoginScriptsOptions {
    scripts?: LoginScript[]
}

export class LoginScriptProcessor extends SessionMiddleware {
    private remainingScripts: LoginScript[] = []

    private escapeSeqMap = {
        a: '\x07',
        b: '\x08',
        e: '\x1b',
        f: '\x0c',
        n: '\x0a',
        r: '\x0d',
        t: '\x09',
        v: '\x0b',
    }

    constructor (
        private logger: Logger,
        options: LoginScriptsOptions,
    ) {
        super()
        this.remainingScripts = deepClone(options.scripts ?? [])
        for (const script of this.remainingScripts) {
            if (!script.isRegex) {
                script.expect = this.unescape(script.expect)
            }
            script.send = this.unescape(script.send)
        }
    }

    feedFromSession (data: Buffer): void {
        const dataString = data.toString()

        for (const script of this.remainingScripts) {
            if (!script.expect) {
                continue
            }
            let match = false
            if (script.isRegex) {
                const re = new RegExp(script.expect, 'g')
                match = re.test(dataString)
            } else {
                match = dataString.includes(script.expect)
            }

            if (match) {
                this.logger.info('Executing script:', script)
                this.outputToSession.next(Buffer.from(script.send + '\n'))
                this.remainingScripts = this.remainingScripts.filter(x => x !== script)
            } else {
                if (script.optional) {
                    this.logger.debug('Skip optional script: ' + script.expect)
                    this.remainingScripts = this.remainingScripts.filter(x => x !== script)
                } else {
                    break
                }
            }
        }

        super.feedFromSession(data)
    }

    executeUnconditionalScripts (): void {
        for (const script of this.remainingScripts) {
            if (!script.expect) {
                this.logger.info('Executing script:', script.send)
                this.outputToSession.next(Buffer.from(script.send + '\n'))
                this.remainingScripts = this.remainingScripts.filter(x => x !== script)
            } else {
                break
            }
        }
    }

    unescape (line: string): string {
        line = line.replace(/\\((x\d{2})|(u\d{4}))/g, (match, g) => {
            return String.fromCharCode(parseInt(g.substr(1), 16))
        })
        return line.replace(/\\(.)/g, (match, g) => {
            return this.escapeSeqMap[g] || g
        })
    }
}
