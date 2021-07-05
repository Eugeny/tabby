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

    constructor (
        private logger: Logger,
        options: LoginScriptsOptions
    ) {
        this.remainingScripts = options.scripts ?? []
    }

    feedFromSession (data: Buffer): boolean {
        const dataString = data.toString()

        let found = false
        for (const script of this.remainingScripts) {
            if (!script.expect) {
                continue
            }
            let match = false
            let cmd = ''
            if (script.isRegex) {
                const re = new RegExp(script.expect, 'g')
                if (re.exec(dataString)) {
                    cmd = dataString.replace(re, script.send)
                    match = true
                    found = true
                }
            } else {
                if (dataString.includes(script.expect)) {
                    cmd = script.send
                    match = true
                    found = true
                }
            }

            if (match) {
                this.logger.info('Executing script: "' + cmd + '"')
                this.outputToSession.next(Buffer.from(cmd + '\n'))
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
}
