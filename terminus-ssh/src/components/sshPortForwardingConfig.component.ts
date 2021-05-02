/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, Output, EventEmitter } from '@angular/core'
import { ForwardedPortConfig, PortForwardType } from '../api'

/** @hidden */
@Component({
    selector: 'ssh-port-forwarding-config',
    template: require('./sshPortForwardingConfig.component.pug'),
})
export class SSHPortForwardingConfigComponent {
    @Input() model: ForwardedPortConfig[]
    @Output() forwardAdded = new EventEmitter<ForwardedPortConfig>()
    @Output() forwardRemoved = new EventEmitter<ForwardedPortConfig>()
    newForward: ForwardedPortConfig
    PortForwardType = PortForwardType

    constructor (
    ) {
        this.reset()
    }

    reset () {
        this.newForward = {
            type: PortForwardType.Local,
            host: '127.0.0.1',
            port: 8000,
            targetAddress: '127.0.0.1',
            targetPort: 80,
        }
    }

    async addForward () {
        try {
            this.forwardAdded.emit(this.newForward)
            this.reset()
        } catch (e) {
            console.error(e)
        }
    }

    remove (fw: ForwardedPortConfig) {
        this.forwardRemoved.emit(fw)
    }
}
