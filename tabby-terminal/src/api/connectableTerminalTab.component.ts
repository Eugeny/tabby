import { Injector, Component } from '@angular/core'

import { BaseTerminalProfile } from './interfaces'
import { BaseTerminalTabComponent } from './baseTerminalTab.component'

/**
 * A class to base your custom connectable terminal tabs on
 */
@Component({ template: '' })
export abstract class ConnectableTerminalTabComponent<P extends BaseTerminalProfile> extends BaseTerminalTabComponent<P> {

    protected reconnectOffered = false

    constructor (protected injector: Injector) {
        super(injector)
    }

    abstract initializeSession (): Promise<void>

    async reconnect (): Promise<void> {
        this.session?.destroy()
        await this.initializeSession()
        this.session?.releaseInitialDataBuffer()
    }

}
