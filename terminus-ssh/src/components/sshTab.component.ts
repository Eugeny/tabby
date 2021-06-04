import colors from 'ansi-colors'
import { Spinner } from 'cli-spinner'
import { Component, Injector } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { first } from 'rxjs/operators'
import { RecoveryToken } from 'terminus-core'
import { BaseTerminalTabComponent } from 'terminus-terminal'
import { SSHService } from '../services/ssh.service'
import { SSHConnection, SSHSession } from '../api'
import { SSHPortForwardingModalComponent } from './sshPortForwardingModal.component'


/** @hidden */
@Component({
    selector: 'ssh-tab',
    template: `${BaseTerminalTabComponent.template} ${require('./sshTab.component.pug')}`,
    styles: [require('./sshTab.component.scss'), ...BaseTerminalTabComponent.styles],
    animations: BaseTerminalTabComponent.animations,
})
export class SSHTabComponent extends BaseTerminalTabComponent {
    connection?: SSHConnection
    session: SSHSession|null = null
    private sessionStack: SSHSession[] = []
    private recentInputs = ''
    private reconnectOffered = false
    private spinner = new Spinner({
        text: 'Connecting',
        stream: {
            write: x => this.write(x),
        },
    })
    private spinnerActive = false

    constructor (
        injector: Injector,
        public ssh: SSHService,
        private ngbModal: NgbModal,
    ) {
        super(injector)
    }

    ngOnInit (): void {
        if (!this.connection) {
            throw new Error('Connection not set')
        }

        this.logger = this.log.create('terminalTab')

        this.enableDynamicTitle = !this.connection.disableDynamicTitle

        this.subscribeUntilDestroyed(this.hotkeys.matchedHotkey, hotkey => {
            if (!this.hasFocus) {
                return
            }
            switch (hotkey) {
                case 'home':
                    this.sendInput('\x1b[H' )
                    break
                case 'end':
                    this.sendInput('\x1b[F' )
                    break
                case 'restart-ssh-session':
                    this.reconnect()
                    break
            }
        })

        this.frontendReady$.pipe(first()).subscribe(() => {
            this.initializeSession()
            this.input$.subscribe(data => {
                this.recentInputs += data
                this.recentInputs = this.recentInputs.substring(this.recentInputs.length - 32)
            })
        })

        super.ngOnInit()

        setImmediate(() => {
            this.setTitle(this.connection!.name)
        })
    }

    async setupOneSession (session: SSHSession): Promise<void> {
        if (session.connection.jumpHost) {
            const jumpConnection: SSHConnection|null = this.config.store.ssh.connections.find(x => x.name === session.connection.jumpHost)

            if (!jumpConnection) {
                throw new Error(`${session.connection.host}: jump host "${session.connection.jumpHost}" not found in your config`)
            }

            const jumpSession = this.ssh.createSession(jumpConnection)

            await this.setupOneSession(jumpSession)

            this.attachSessionHandler(jumpSession.destroyed$, () => {
                if (session.open) {
                    session.destroy()
                }
            })

            session.jumpStream = await new Promise((resolve, reject) => jumpSession.ssh.forwardOut(
                '127.0.0.1', 0, session.connection.host, session.connection.port ?? 22,
                (err, stream) => {
                    if (err) {
                        jumpSession.emitServiceMessage(colors.bgRed.black(' X ') + ` Could not set up port forward on ${jumpConnection.name}`)
                        return reject(err)
                    }
                    resolve(stream)
                }
            ))

            session.jumpStream.on('close', () => {
                jumpSession.destroy()
            })

            this.sessionStack.push(session)
        }

        this.write('\r\n' + colors.black.bgWhite(' SSH ') + ` Connecting to ${session.connection.host}\r\n`)

        this.startSpinner()

        this.attachSessionHandler(session.serviceMessage$, msg => {
            this.pauseSpinner(() => {
                this.write(`\r${colors.black.bgWhite(' SSH ')} ${msg}\r\n`)
                session.resize(this.size.columns, this.size.rows)
            })
        })

        try {
            await this.ssh.connectSession(session)
            this.stopSpinner()
        } catch (e) {
            this.stopSpinner()
            this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
            return
        }
    }

    protected attachSessionHandlers (): void {
        const session = this.session!
        this.attachSessionHandler(session.destroyed$, () => {
            if (
                // Ctrl-D
                this.recentInputs.charCodeAt(this.recentInputs.length - 1) === 4 ||
                this.recentInputs.endsWith('exit\r')
            ) {
                // User closed the session
                this.destroy()
            } else {
                // Session was closed abruptly
                this.write('\r\n' + colors.black.bgWhite(' SSH ') + ` ${session.connection.host}: session closed\r\n`)
                if (!this.reconnectOffered) {
                    this.reconnectOffered = true
                    this.write('Press any key to reconnect\r\n')
                    this.input$.pipe(first()).subscribe(() => {
                        if (!this.session?.open && this.reconnectOffered) {
                            this.reconnect()
                        }
                    })
                }
            }
        })
        super.attachSessionHandlers()
    }

    async initializeSession (): Promise<void> {
        this.reconnectOffered = false
        if (!this.connection) {
            this.logger.error('No SSH connection info supplied')
            return
        }

        const session = this.ssh.createSession(this.connection)
        this.setSession(session)

        try {
            await this.setupOneSession(session)
        } catch (e) {
            this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
        }

        await this.session!.start()
        this.session!.resize(this.size.columns, this.size.rows)
    }

    async getRecoveryToken (): Promise<RecoveryToken> {
        return {
            type: 'app:ssh-tab',
            connection: this.connection,
            savedState: this.frontend?.saveState(),
        }
    }

    showPortForwarding (): void {
        const modal = this.ngbModal.open(SSHPortForwardingModalComponent).componentInstance as SSHPortForwardingModalComponent
        modal.session = this.session!
    }

    async reconnect (): Promise<void> {
        this.session?.destroy()
        await this.initializeSession()
        this.session?.releaseInitialDataBuffer()
    }

    async canClose (): Promise<boolean> {
        if (!this.session?.open) {
            return true
        }
        if (!(this.connection?.warnOnClose ?? this.config.store.ssh.warnOnClose)) {
            return true
        }
        return (await this.platform.showMessageBox(
            {
                type: 'warning',
                message: `Disconnect from ${this.connection?.host}?`,
                buttons: ['Cancel', 'Disconnect'],
                defaultId: 1,
            }
        )).response === 1
    }

    private startSpinner () {
        this.spinner.setSpinnerString(6)
        this.spinner.start()
        this.spinnerActive = true
    }

    private stopSpinner () {
        this.spinner.stop(true)
        this.spinnerActive = false
    }

    private pauseSpinner (work: () => void) {
        const wasActive = this.spinnerActive
        this.stopSpinner()
        work()
        if (wasActive) {
            this.startSpinner()
        }
    }
}
