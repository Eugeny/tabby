import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { first } from 'rxjs/operators'
import { BaseTerminalTabComponent } from 'terminus-terminal'
import { SSHService } from '../services/ssh.service'
import { SSHConnection, SSHSession } from '../api'
import { SSHPortForwardingModalComponent } from './sshPortForwardingModal.component'

/** @hidden */
@Component({
    template: BaseTerminalTabComponent.template + require<string>('./sshTab.component.pug'),
    styles: [require('./sshTab.component.scss'), ...BaseTerminalTabComponent.styles],
    animations: BaseTerminalTabComponent.animations,
})
export class SSHTabComponent extends BaseTerminalTabComponent {
    connection: SSHConnection
    ssh: SSHService
    session: SSHSession
    private ngbModal: NgbModal

    ngOnInit () {
        this.ngbModal = this.injector.get<NgbModal>(NgbModal)

        this.logger = this.log.create('terminalTab')
        this.ssh = this.injector.get(SSHService)
        this.frontendReady$.pipe(first()).subscribe(() => {
            this.initializeSession()
        })

        super.ngOnInit()

        setImmediate(() => {
            this.setTitle(this.connection.name)
        })
    }

    async initializeSession () {
        if (!this.connection) {
            this.logger.error('No SSH connection info supplied')
            return
        }

        this.session = this.ssh.createSession(this.connection)
        this.session.serviceMessage$.subscribe(msg => {
            this.write(`\r\n[SSH] ${msg}\r\n`)
            this.session.resize(this.size.columns, this.size.rows)
        })
        this.attachSessionHandlers()
        this.write(`Connecting to ${this.connection.host}`)
        const interval = setInterval(() => this.write('.'), 500)
        try {
            await this.ssh.connectSession(this.session, (message: string) => {
                this.write('\r\n' + message)
            })
        } catch (e) {
            this.write('\r\n')
            this.write(e.message)
            return
        } finally {
            clearInterval(interval)
            this.write('\r\n')
        }
        await this.session.start()
        this.session.resize(this.size.columns, this.size.rows)
    }

    async getRecoveryToken (): Promise<any> {
        return {
            type: 'app:ssh-tab',
            connection: this.connection,
        }
    }

    showPortForwarding () {
        const modal = this.ngbModal.open(SSHPortForwardingModalComponent).componentInstance as SSHPortForwardingModalComponent
        modal.session = this.session
    }

    reconnect () {
        this.initializeSession()
    }
}
