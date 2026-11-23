import { Injectable, Injector } from '@angular/core'
import { BaseTabComponent, NewTabParameters, ProfilesService, RecoveryToken, TabRecoveryProvider, TabTransferProvider } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { RelayedTerminalTabComponent } from './components/relayedTerminalTab.component'
import { SessionRelayService } from './services/sessionRelay.service'

/**
 * Moves terminal tabs whose session lives in this window's process (SSH, Telnet,
 * serial) by keeping the session running here and relaying it to the other window.
 *
 * @hidden
 */
@Injectable()
export class RelayingTabTransferProvider extends TabTransferProvider<BaseTerminalTabComponent<any>> {
    constructor (private relay: SessionRelayService) {
        super()
    }

    applicableTo (tab: BaseTabComponent): boolean {
        return tab instanceof BaseTerminalTabComponent && !(tab instanceof RelayedTerminalTabComponent) && tab.frontendIsReady
    }

    async prepare (tab: BaseTerminalTabComponent<any>): Promise<RecoveryToken|null> {
        const originalToken = await tab.getRecoveryToken({ includeState: false })
        const { relayID, savedState } = await this.relay.startHosting(tab)
        return {
            type: 'app:relayed-terminal-tab',
            relayID,
            profile: tab.profile,
            originalToken,
            savedState,
        }
    }

    async release (tab: BaseTerminalTabComponent<any>): Promise<void> {
        this.relay.finishHandover(tab)
    }

    async cancel (tab: BaseTerminalTabComponent<any>): Promise<void> {
        await this.relay.cancelHosting(tab)
    }
}

/**
 * Moves a relayed tab on to yet another window, which then connects to the same session
 *
 * @hidden
 */
@Injectable()
export class RelayedTabTransferProvider extends TabTransferProvider<RelayedTerminalTabComponent> {
    weight = 20

    constructor (private relay: SessionRelayService) {
        super()
    }

    applicableTo (tab: BaseTabComponent): boolean {
        return tab instanceof RelayedTerminalTabComponent && !!tab.session?.open
    }

    async prepare (tab: RelayedTerminalTabComponent): Promise<RecoveryToken|null> {
        await tab.session!.pauseOutput()
        await tab.waitForFrontendWrites()
        return tab.getTransferToken()
    }

    async release (tab: RelayedTerminalTabComponent): Promise<void> {
        tab.session?.detach()
        this.relay.disconnect(tab.relayID)
        tab.destroy()
    }

    async cancel (tab: RelayedTerminalTabComponent): Promise<void> {
        tab.session?.resumeOutput()
    }
}

/** @hidden */
@Injectable()
export class RelayedTerminalTabRecoveryProvider extends TabRecoveryProvider<RelayedTerminalTabComponent> {
    // ProfilesService is resolved lazily - it depends on AppService, which depends on all recovery providers
    constructor (private injector: Injector) {
        super()
    }

    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:relayed-terminal-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<RelayedTerminalTabComponent>> {
        return {
            type: RelayedTerminalTabComponent,
            inputs: {
                relayID: recoveryToken.relayID,
                originalToken: recoveryToken.originalToken,
                profile: this.injector.get(ProfilesService).getConfigProxyForProfile(recoveryToken.profile),
                savedState: recoveryToken.savedState,
            },
        }
    }
}
