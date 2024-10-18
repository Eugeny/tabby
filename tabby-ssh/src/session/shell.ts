import { Observable, Subject } from 'rxjs'
import stripAnsi from 'strip-ansi'
import { Injector } from '@angular/core'
import { LogService } from 'tabby-core'
import { BaseSession, UTF8SplitterMiddleware, InputProcessor } from 'tabby-terminal'
import { SSHSession } from './ssh'
import { SSHProfile } from '../api'
import * as russh from 'russh'


export class SSHShellSession extends BaseSession {
    shell?: russh.Channel
    get serviceMessage$ (): Observable<string> { return this.serviceMessage }
    private serviceMessage = new Subject<string>()
    private ssh: SSHSession|null

    constructor (
        injector: Injector,
        ssh: SSHSession,
        private profile: SSHProfile,
    ) {
        super(injector.get(LogService).create(`ssh-shell-${profile.options.host}-${profile.options.port}`))
        this.ssh = ssh
        this.setLoginScriptsOptions(this.profile.options)
        this.ssh.serviceMessage$.subscribe(m => this.serviceMessage.next(m))
        this.middleware.push(new UTF8SplitterMiddleware())
        this.middleware.push(new InputProcessor(profile.options.input))
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

        this.shell.data$.subscribe(data => {
            this.emitOutput(Buffer.from(data))
        })

        this.shell.eof$.subscribe(() => {
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
        this.shell?.resizePTY({
            columns,
            rows,
            pixHeight: 0,
            pixWidth: 0,
        })
    }

    write (data: Buffer): void {
        if (this.shell) {
            this.shell.write(new Uint8Array(data))
        }
    }

    kill (_signal?: string): void {
        // this.shell?.signal(signal ?? 'TERM')
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
