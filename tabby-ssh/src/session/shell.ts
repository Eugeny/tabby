import { Observable, Subject } from 'rxjs'
import colors from 'ansi-colors'
import stripAnsi from 'strip-ansi'
import { ClientChannel } from 'ssh2'
import { Injector } from '@angular/core'
import { LogService } from 'tabby-core'
import { BaseSession } from 'tabby-terminal'
import { SSHSession } from './ssh'
import { SSHProfile } from '../api'


export class SSHShellSession extends BaseSession {
    shell?: ClientChannel
    private profile: SSHProfile
    get serviceMessage$ (): Observable<string> { return this.serviceMessage }
    private serviceMessage = new Subject<string>()
    private ssh: SSHSession|null

    constructor (
        injector: Injector,
        ssh: SSHSession,
    ) {
        super(injector.get(LogService).create(`ssh-shell-${ssh.profile.options.host}-${ssh.profile.options.port}`))
        this.ssh = ssh
        this.profile = ssh.profile
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
            this.emitServiceMessage(colors.bgRed.black(' X ') + ` Remote rejected opening a shell channel: ${err}`)
            if (err.toString().includes('Unable to request X11')) {
                this.emitServiceMessage('    Make sure `xauth` is installed on the remote side')
            }
            return
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

    async getWorkingDirectory (): Promise<string|null> {
        return this.reportedCWD ?? null
    }
}
