import { Component } from '@angular/core'
import { first } from 'rxjs/operators'
import { BaseTerminalTabComponent } from 'terminus-terminal'
import { SSHService } from '../services/ssh.service'
import { SSHConnection, SSHSession } from '../api'

@Component({
    template: `
        <div
            #content
            class="content"
        ></div>
    `,
    styles: [require('./sshTab.component.scss')],
})
export class SSHTabComponent extends BaseTerminalTabComponent {
    connection: SSHConnection
    ssh: SSHService
    session: SSHSession

    ngOnInit () {
        this.logger = this.log.create('terminalTab')
        this.ssh = this.injector.get(SSHService)
        this.frontendReady$.pipe(first()).subscribe(() => {
            this.initializeSession()
        })

        super.ngOnInit()
    }

    async initializeSession () {
        if (!this.connection) {
            this.logger.error('No SSH connection info supplied')
            return
        }

        this.session = new SSHSession(this.connection)
        this.attachSessionHandlers()
        this.write(`Connecting to ${this.connection.host}`)
        let interval = setInterval(() => this.write('.'), 500)
        try {
            await this.ssh.connectSession(this.session, message => {
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
        this.session.resize(this.size.columns, this.size.rows)
        this.session.start()
    }

    async getRecoveryToken (): Promise<any> {
        return {
            type: 'app:ssh-tab',
            connection: this.connection,
        }
    }
}
