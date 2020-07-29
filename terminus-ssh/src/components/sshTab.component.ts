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
import { Subscription } from 'rxjs'


/** @hidden */
@Component({
    selector: 'ssh-tab',
    template: BaseTerminalTabComponent.template + require<string>('./sshTab.component.pug'),
    styles: [require('./sshTab.component.scss'), ...BaseTerminalTabComponent.styles],
    animations: BaseTerminalTabComponent.animations,
})
export class SSHTabComponent extends BaseTerminalTabComponent {
    connection: SSHConnection
    session: SSHSession
    private sessionStack: SSHSession[] = []
    private homeEndSubscription: Subscription

    constructor (
        injector: Injector,
        public ssh: SSHService,
        private ngbModal: NgbModal,
    ) {
        super(injector)
    }

    ngOnInit (): void {
        this.logger = this.log.create('terminalTab')

        this.enableDynamicTitle = !this.connection.disableDynamicTitle

        this.homeEndSubscription = this.hotkeys.matchedHotkey.subscribe(hotkey => {
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
            }
        })

        this.frontendReady$.pipe(first()).subscribe(() => {
            this.initializeSession()
        })

        super.ngOnInit()

        setImmediate(() => {
            this.setTitle(this.connection.name)
        })
    }

    async setupOneSession (session: SSHSession): Promise<void> {
        if (session.connection.jumpHost) {
            const jumpConnection = this.config.store.ssh.connections.find(x => x.name === session.connection.jumpHost)
            const jumpSession = this.ssh.createSession(jumpConnection)

            await this.setupOneSession(jumpSession)

            jumpSession.destroyed$.subscribe(() => session.destroy())

            session.jumpStream = await new Promise((resolve, reject) => jumpSession.ssh.forwardOut(
                '127.0.0.1', 0, session.connection.host, session.connection.port,
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


        session.serviceMessage$.subscribe(msg => {
            this.write('\r\n' + colors.black.bgWhite(' SSH ') + ' ' + msg + '\r\n')
            session.resize(this.size.columns, this.size.rows)
        })

        session.destroyed$.subscribe(() => {
            this.write('\r\n' + colors.black.bgCyan(' SSH ') + ` ${session.connection.host}: session closed\r\n`)
        })

        this.write('\r\n' + colors.black.bgCyan(' SSH ') + ` Connecting to ${session.connection.host}\r\n`)

        const spinner = new Spinner({
            text: 'Connecting',
            stream: {
                write: x => this.write(x),
            },
        })
        spinner.setSpinnerString(6)
        spinner.start()

        try {
            await this.ssh.connectSession(session, (message: string) => {
                spinner.stop(true)
                this.write(message + '\r\n')
                spinner.start()
            })
            spinner.stop(true)
        } catch (e) {
            spinner.stop(true)
            this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
            return
        }
    }

    async initializeSession (): Promise<void> {
        if (!this.connection) {
            this.logger.error('No SSH connection info supplied')
            return
        }

        this.session = this.ssh.createSession(this.connection)

        await this.setupOneSession(this.session)

        this.attachSessionHandlers()

        await this.session.start()
        this.session.resize(this.size.columns, this.size.rows)
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
        modal.session = this.session
    }

    async reconnect (): Promise<void> {
        this.session?.destroy()
        await this.initializeSession()
        this.session.releaseInitialDataBuffer()
    }

    async canClose (): Promise<boolean> {
        if (!this.session?.open) {
            return true
        }
        return (await this.electron.showMessageBox(
            this.hostApp.getWindow(),
            {
                type: 'warning',
                message: `Disconnect from ${this.connection.host}?`,
                buttons: ['Cancel', 'Disconnect'],
                defaultId: 1,
            }
        )).response === 1
    }

    ngOnDestroy (): void {
        this.homeEndSubscription.unsubscribe()
        super.ngOnDestroy()
    }
}
