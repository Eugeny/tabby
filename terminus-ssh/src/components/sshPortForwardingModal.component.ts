/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ForwardedPort, PortForwardType, SSHSession } from '../api'

/** @hidden */
@Component({
    template: require('./sshPortForwardingModal.component.pug'),
    // styles: [require('./sshPortForwardingModal.component.scss')],
})
export class SSHPortForwardingModalComponent {
    @Input() session: SSHSession
    newForward = new ForwardedPort()
    PortForwardType = PortForwardType

    constructor (
        public modalInstance: NgbActiveModal,
    ) {
        this.reset()
    }

    reset () {
        this.newForward = new ForwardedPort()
        this.newForward.type = PortForwardType.Local
        this.newForward.host = '127.0.0.1'
        this.newForward.port = 8000
        this.newForward.targetAddress = '127.0.0.1'
        this.newForward.targetPort = 80
    }

    async addForward () {
        try {
            await this.session.addPortForward(this.newForward)
            this.reset()
        } catch (e) {
            console.error(e)
        }
    }

    remove (fw: ForwardedPort) {
        this.session.removePortForward(fw)
    }
}
