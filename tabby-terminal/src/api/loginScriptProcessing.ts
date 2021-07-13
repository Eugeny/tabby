import deepClone from 'clone-deep'
import { Subject, Observable } from 'rxjs'
import { Logger } from 'tabby-core'

export interface LoginScript {
    expect: string
    send: string
    isRegex?: boolean
    optional?: boolean
}

export interface LoginScriptsOptions {
    scripts?: LoginScript[]
}

export class LoginScriptProcessor {
    get outputToSession$ (): Observable<Buffer> { return this.outputToSession }

    private outputToSession = new Subject<Buffer>()
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
        options: LoginScriptsOptions
    ) {
        this.remainingScripts = deepClone(options.scripts ?? [])
        for (const script of this.remainingScripts) {
            if (!script.isRegex) {
                script.expect = this.unescape(script.expect)
            }
            script.send = this.unescape(script.send)
        }
    }

    feedFromSession (data: Buffer): boolean {
        const dataString = data.toString()

        let found = false
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
                found = true
                this.logger.info('Executing script:', script)
                this.outputToSession.next(Buffer.from(script.send + '\n'))
                this.remainingScripts = this.remainingScripts.filter(x => x !== script)
            } else {
                if (script.optional) {
                    this.logger.debug('Skip optional script: ' + script.expect)
                    found = true
                    this.remainingScripts = this.remainingScripts.filter(x => x !== script)
                } else {
                    break
                }
            }
        }

        return found
    }

    close (): void {
        this.outputToSession.complete()
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
