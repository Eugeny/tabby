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

    async initializeSession (): Promise<void> {
        if (!this.connection) {
            this.logger.error('No SSH connection info supplied')
            return
        }

        this.session = this.ssh.createSession(this.connection)
        this.session.serviceMessage$.subscribe(msg => {
            this.write('\r\n' + colors.black.bgWhite(' SSH ') + ' ' + msg + '\r\n')
            this.session.resize(this.size.columns, this.size.rows)
        })
        this.attachSessionHandlers()
        this.write(`Connecting to ${this.connection.host}`)

        const spinner = new Spinner({
            text: 'Connecting',
            stream: {
                write: x => this.write(x),
            },
        })
        spinner.setSpinnerString(6)
        spinner.start()

        try {
            await this.ssh.connectSession(this.session, (message: string) => {
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

    reconnect (): void {
        this.initializeSession()
    }

    ngOnDestroy (): void {
        this.homeEndSubscription.unsubscribe()
        super.ngOnDestroy()
    }
}
