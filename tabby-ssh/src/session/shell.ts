import { Observable, Subject } from 'rxjs'
import stripAnsi from 'strip-ansi'
import { ClientChannel } from 'ssh2'
import { Injector } from '@angular/core'
import { LogService } from 'tabby-core'
import { BaseSession } from 'tabby-terminal'
import { SSHSession } from './ssh'
import { SSHProfile } from '../api'


export class SSHShellSession extends BaseSession {
    shell?: ClientChannel
    get serviceMessage$ (): Observable<string> { return this.serviceMessage }
    private serviceMessage = new Subject<string>()
    private ssh: SSHSession | null

    constructor (
        injector: Injector,
        ssh: SSHSession,
        private profile: SSHProfile,
    ) {
        super(injector.get(LogService).create(`ssh-shell-${profile.options.host}-${profile.options.port}`))
        this.ssh = ssh
        this.setLoginScriptsOptions(this.profile.options)
        this.ssh.serviceMessage$.subscribe(m => this.serviceMessage.next(m))
    }

    async start (): Promise<void> {
        if (!this.ssh) {
            throw new Error('SSH session not set')
        }

        this.ssh.ref()
        this.ssh.willDestroy$.subscribe(() => {
            this.destroy()
        })

        this.logger.debug('Opening shell')

        try {
            this.shell = await this.ssh.openShellChannel({ x11: this.profile.options.x11 ?? false })
        } catch (err) {
            if (err.toString().includes('Unable to request X11')) {
                this.emitServiceMessage('    Make sure `xauth` is installed on the remote side')
            }
            throw new Error(`Remote rejected opening a shell channel: ${err}`)
        }

        this.open = true
        this.logger.debug('Shell open')

        this.loginScriptProcessor?.executeUnconditionalScripts()

        this.shell.on('greeting', greeting => {
            this.emitServiceMessage(`Shell greeting: ${greeting}`)
        })

        this.shell.on('banner', banner => {
            this.emitServiceMessage(`Shell banner: ${banner}`)
        })

        this.shell.on('data', data => {
            this.emitOutput(data)
        })

        this.shell.on('end', () => {
            this.logger.info('Shell session ended')
            if (this.open) {
                this.destroy()
            }
        })

        if (this.profile.options.userLoginScripts
            && this.profile.options.userLoginScripts.length > 0
            && this.profile.options.userLoginScriptsDelay
            && this.profile.options.userLoginScriptsDelay >= 0
        ) {
            const userLoginScriptsDelay = this.profile.options.userLoginScriptsDelay
            const userLoginScripts = this.profile.options.userLoginScripts + '\r\n'
            setTimeout(() => {
                this.write(Buffer.from(userLoginScripts))
            }, userLoginScriptsDelay)
        }
    }

    emitServiceMessage (msg: string): void {
        this.serviceMessage.next(msg)
        this.logger.info(stripAnsi(msg))
    }

    resize (columns: number, rows: number): void {
        if (this.shell) {
            this.shell.setWindow(rows, columns, rows, columns)
        }
    }

    write (data: Buffer): void {
        if (this.shell) {
            this.shell.write(data)
        }
    }

    kill (signal?: string): void {
        this.shell?.signal(signal ?? 'TERM')
    }

    async destroy (): Promise<void> {
        this.logger.debug('Closing shell')
        this.serviceMessage.complete()
        this.kill()
        this.ssh?.unref()
        this.ssh = null
        await super.destroy()
    }

    async getChildProcesses (): Promise<any[]> {
        return []
    }

    async gracefullyKillProcess (): Promise<void> {
        this.kill('TERM')
    }

    supportsWorkingDirectory (): boolean {
        return !!this.reportedCWD
    }

    async getWorkingDirectory (): Promise<string | null> {
        return this.reportedCWD ?? null
    }
}
