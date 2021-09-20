/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'
import { ForwardedPort } from '../session/forwards'
import { SSHSession } from '../session/ssh'
import { ForwardedPortConfig } from '../api'

/** @hidden */
@Component({
    template: require('./sshPortForwardingModal.component.pug'),
})
export class SSHPortForwardingModalComponent {
    @Input() session: SSHSession

    onForwardAdded (fw: ForwardedPortConfig) {
        const newForward = new ForwardedPort()
        Object.assign(newForward, fw)
        this.session.addPortForward(newForward)
    }

    onForwardRemoved (fw: ForwardedPortConfig) {
        this.session.removePortForward(fw as ForwardedPort)
    }
}
