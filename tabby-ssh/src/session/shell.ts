import { Observable, Subject, Subscription } from 'rxjs'
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
    private cwdReportingInstalled = false
    private restoredDirectory = false
    private restoreAttempts = 0
    private restoreDeadline = 0
    private cwdSubscription?: Subscription

    constructor (
        injector: Injector,
        ssh: SSHSession,
        private profile: SSHProfile,
        private initialDirectory?: string|null,
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
            this.shell = await this.ssh.openShellChannel({ x11: this.profile.options.x11 })
        } catch (err) {
            if (err.toString().includes('Unable to request X11')) {
                this.emitServiceMessage('    Make sure `xauth` is installed on the remote side')
            }
            throw new Error(`Remote rejected opening a shell channel: ${err}`)
        }

        this.open = true
        this.logger.debug('Shell open')

        this.loginScriptProcessor?.executeUnconditionalScripts()
        this.installCwdReporting()
        this.restoreDeadline = Date.now() + 15000
        this.cwdSubscription = this.oscProcessor.cwdReported$.subscribe(cwd => {
            this.maybeRestoreDirectory(cwd)
        })
        this.restoreInitialDirectory()

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

    private installCwdReporting (): void {
        if (this.cwdReportingInstalled) {
            return
        }
        this.cwdReportingInstalled = true

        const snippet = [
            'if [ -n "$BASH_VERSION" ]; then',
            '  __tabby_osc_cwd(){ printf "\\033]1337;CurrentDir=%s\\007" "$PWD"; }',
            '  case ";$PROMPT_COMMAND;" in',
            '    *";__tabby_osc_cwd;"*) ;;',
            '    *) PROMPT_COMMAND="__tabby_osc_cwd${PROMPT_COMMAND:+;$PROMPT_COMMAND}";;',
            '  esac',
            '  __tabby_osc_cwd',
            'elif [ -n "$ZSH_VERSION" ]; then',
            '  __tabby_osc_cwd(){ print -n "\\033]1337;CurrentDir=$PWD\\007"; }',
            '  (( ${precmd_functions[(Ie)__tabby_osc_cwd]} )) || precmd_functions+=(__tabby_osc_cwd)',
            '  __tabby_osc_cwd',
            'fi',
        ].join('\n')

        this.write(Buffer.from(snippet + '\n'))
    }


    private restoreInitialDirectory (): void {
        if (this.restoredDirectory) {
            return
        }
        this.restoredDirectory = true
        this.attemptRestoreDirectory()
    }

    private maybeRestoreDirectory (currentDir: string): void {
        const desired = this.getDesiredDirectory()
        if (!desired) {
            return
        }
        if (Date.now() > this.restoreDeadline) {
            this.cwdSubscription?.unsubscribe()
            return
        }
        if (this.normalizeDirectory(currentDir) === desired) {
            this.cwdSubscription?.unsubscribe()
            return
        }
        this.attemptRestoreDirectory()
    }

    private attemptRestoreDirectory (): void {
        const desired = this.getDesiredDirectory()
        if (!desired || desired === '/') {
            return
        }
        if (this.restoreAttempts >= 3) {
            return
        }
        this.restoreAttempts++
        this.write(Buffer.from(`cd -- ${this.shellEscape(desired)}\n`))
    }

    private getDesiredDirectory (): string|null {
        if (!this.initialDirectory) {
            return null
        }
        return this.normalizeDirectory(this.initialDirectory)
    }

    private normalizeDirectory (value: string): string {
        value = value.trim()
        if (value === '/') {
            return value
        }
        value = value.replace(/\/+$/g, '')
        return value || '/'
    }

    private shellEscape (value: string): string {
        return "'" + value.replace(/'/g, "'\\''") + "'"
    }

    kill (_signal?: string): void {
        // this.shell?.signal(signal ?? 'TERM')
    }

    async destroy (): Promise<void> {
        this.logger.debug('Closing shell')
        this.serviceMessage.complete()
        this.cwdSubscription?.unsubscribe()
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
