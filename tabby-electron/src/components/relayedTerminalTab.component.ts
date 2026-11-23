import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Component, Input, Injector } from '@angular/core'
import { GetRecoveryTokenOptions, RecoveryToken } from 'tabby-core'
import { BaseTerminalProfile, BaseTerminalTabComponent } from 'tabby-terminal'
import { SessionRelayService } from '../services/sessionRelay.service'
import { RelaySession } from '../sessionRelay/relaySession'

/**
 * Displays a terminal session that keeps running in another window
 * (see [[SessionRelayService]])
 *
 * @hidden
 */
@Component({
    selector: 'relayed-terminal-tab',
    template: BaseTerminalTabComponent.template,
    styles: BaseTerminalTabComponent.styles,
    animations: BaseTerminalTabComponent.animations,
})
export class RelayedTerminalTabComponent extends BaseTerminalTabComponent<BaseTerminalProfile> {
    @Input() relayID: string

    /**
     * Recovery token of the tab in the window that runs the session.
     * Restoring the tab after a restart starts a new session from it.
     */
    @Input() originalToken: RecoveryToken|null = null

    session: RelaySession|null = null

    constructor (
        injector: Injector,
        private relay: SessionRelayService,
    ) {
        super(injector)
    }

    ngOnInit (): void {
        this.logger = this.log.create('relayedTerminalTab')
        // The saved state belongs to the very session we're about to connect to
        this.savedStateIsLive = true

        this.subscribeUntilDestroyed(this.relay.hostGone$, relayID => {
            if (relayID === this.relayID && this.session?.open) {
                this.session.detach()
                this.writeServiceMessage(this.translate.instant(_('The window running this session has been closed')))
            }
        })

        super.ngOnInit()
    }

    protected onFrontendReady (): void {
        super.onFrontendReady()
        this.connect()
    }

    /**
     * Returns a token that lets yet another window take this tab over
     */
    getTransferToken (): RecoveryToken {
        return {
            type: 'app:relayed-terminal-tab',
            relayID: this.relayID,
            profile: this.profile,
            originalToken: this.originalToken,
            savedState: this.frontend?.saveState({ live: true }),
        }
    }

    async getRecoveryToken (options?: GetRecoveryTokenOptions): Promise<RecoveryToken|null> {
        if (!this.originalToken) {
            return null
        }
        return {
            ...this.originalToken,
            savedState: options?.includeState && this.frontend?.saveState(),
        }
    }

    private async connect () {
        const port = await this.relay.connect(this.relayID)
        if (!port) {
            this.writeServiceMessage(this.translate.instant(_('This session is not available anymore')))
            return
        }
        const session = new RelaySession(this.logger, port, this.zone)
        this.setSession(session, true)
        await session.start()
        session.resize(this.size.columns, this.size.rows)
    }

    private writeServiceMessage (message: string) {
        this.write(`\r\n\x1b[30;47m * \x1b[0m ${message}\r\n`)
    }
}
