/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, Output, EventEmitter } from '@angular/core'
import { ForwardedPortConfig, PortForwardType } from 'tabby-ssh'
import { isLoopbackBindAddress, parseTunnelSpec } from '../session/tunnelSpec'

/** @hidden */
@Component({
    selector: 'et-port-forwarding-config',
    templateUrl: './etPortForwardingConfig.component.pug',
})
export class ETPortForwardingConfigComponent {
    @Input() model: ForwardedPortConfig[]
    @Output() forwardAdded = new EventEmitter<ForwardedPortConfig>()
    @Output() forwardRemoved = new EventEmitter<ForwardedPortConfig>()
    newForward: ForwardedPortConfig
    spec = ''
    specError: string|null = null
    /** ET has no Dynamic forwarding. */
    PortForwardType = PortForwardType

    constructor () {
        this.reset()
    }

    /**
     * A Local forward binding a non-loopback address publishes the tunnel to the
     * whole network - anyone who can reach this machine gets to use it. Only
     * Local forwards bind here; a Remote forward's `host` is bound by etserver.
     */
    exposesToNetwork (fw: ForwardedPortConfig): boolean {
        return fw.type === PortForwardType.Local && !isLoopbackBindAddress(fw.host)
    }

    reset (): void {
        this.newForward = {
            type: PortForwardType.Local,
            host: '127.0.0.1',
            port: 8000,
            targetAddress: 'localhost',
            targetPort: 80,
            description: '',
        }
    }

    addForward (): void {
        this.specError = null
        // The inputs are type=number but the browser happily hands us NaN or
        // out-of-range values; catch them here instead of at net.createServer.
        for (const [name, port] of [['port', this.newForward.port], ['target port', this.newForward.targetPort]] as const) {
            if (!Number.isInteger(port) || port < 1 || port > 65535) {
                this.specError = `Invalid ${name} "${port}". Ports must be between 1 and 65535.`
                return
            }
        }
        this.forwardAdded.emit(this.newForward)
        this.reset()
    }

    remove (fw: ForwardedPortConfig): void {
        this.forwardRemoved.emit(fw)
        this.newForward = fw
    }

    importSpec (): void {
        this.specError = null
        try {
            for (const fw of parseTunnelSpec(this.spec, this.newForward.type)) {
                this.forwardAdded.emit(fw)
            }
            this.spec = ''
        } catch (e) {
            this.specError = e.message
        }
    }
}
