import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Component, HostListener, Injector } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import stripAnsi from 'strip-ansi'
import { Platform, StickyNotification } from 'tabby-core'
import { BaseTerminalTabComponent, ConnectableTerminalTabComponent } from 'tabby-terminal'
import { KeyboardInteractivePrompt, SSHProfile } from 'tabby-ssh'

import { ETProfile } from '../api/interfaces'
import { ETSession } from '../session/etSession'
import { ETConnectionState } from '../protocol/connection'
import { ETPortForwardingModalComponent } from './etPortForwardingModal.component'

/** @hidden */
@Component({
    selector: 'et-tab',
    template: `${BaseTerminalTabComponent.template} ${require('./etTab.component.pug')}`,
    styles: [...BaseTerminalTabComponent.styles, require('./etTab.component.scss')],
    animations: BaseTerminalTabComponent.animations,
})
export class ETTabComponent extends ConnectableTerminalTabComponent<ETProfile> {
    Platform = Platform
    session: ETSession|null = null
    connectionState: ETConnectionState = 'connecting'
    activeKIPrompt: KeyboardInteractivePrompt|null = null
    /** The synthesised SSH profile, needed by the keyboard-interactive panel. */
    bootstrapProfile: SSHProfile|null = null

    private disconnectToast: StickyNotification|null = null

    constructor (
        injector: Injector,
        private ngbModal: NgbModal,
    ) {
        super(injector)
        this.enableToolbar = true
        this.sessionChanged$.subscribe(() => {
            this.activeKIPrompt = null
        })
    }

    ngOnInit (): void {
        this.subscribeUntilDestroyed(this.hotkeys.hotkey$, hotkey => {
            if (!this.hasFocus) {
                return
            }
            switch (hotkey) {
                case 'restart-et-session':
                    this.reconnect()
                    break
                case 'et-force-reconnect':
                    this.session?.forceReconnect()
                    break
            }
        })
        super.ngOnInit()
    }

    async initializeSession (): Promise<void> {
        await super.initializeSession()

        const session = new ETSession(this.injector, this.profile)
        this.setSession(session)

        this.attachSessionHandler(session.serviceMessage$, msg => {
            this.showServiceToast(msg)
        })
        this.attachSessionHandler(session.connectionState$, state => {
            this.onETConnectionState(state)
        })
        this.attachSessionHandler(session.keyboardInteractivePrompt$, prompt => {
            this.activeKIPrompt = prompt
            setTimeout(() => this.frontend?.scrollToBottom())
        })
        // The KI panel needs the SSH profile the bootstrap actually used, so it can
        // look up and offer to save the password.
        this.attachSessionHandler(session.bootstrapSession$, s => {
            this.bootstrapProfile = s.profile
        })

        this.startSpinner(this.translate.instant(_('Connecting')))
        try {
            await session.start()
            this.session?.resize(this.size.columns, this.size.rows)
        } catch (e) {
            this.notifications.error(e.message, this.etNotificationTitle)
            // A session that failed mid-start() never set open=true, so the tab's
            // close path would skip BaseSession.destroy() and leak its timers and
            // local port listeners. Tear it down here instead.
            await session.destroy().catch(() => { /* already down */ })
        } finally {
            this.stopSpinner()
        }
    }

    protected onSessionDestroyed (): void {
        this.dismissDisconnectToast()
        if (this.frontend) {
            this.notifications.info(
                this.translate.instant(_('{host}: session closed'), { host: this.profile.options.host }),
                this.etNotificationTitle,
            )
            super.onSessionDestroyed()
        }
    }

    ngOnDestroy (): void {
        this.dismissDisconnectToast()
        super.ngOnDestroy()
    }

    private onETConnectionState (state: ETConnectionState): void {
        const wasDisconnected = this.disconnectToast !== null
        this.connectionState = state
        if (state === 'reconnecting') {
            this.ensureDisconnectToast()
            return
        }
        this.dismissDisconnectToast()
        if (state === 'connected' && wasDisconnected) {
            this.notifications.success(
                this.translate.instant(_('Session resumed')),
                this.etNotificationTitle,
            )
        }
    }

    private ensureDisconnectToast (): void {
        if (this.disconnectToast) {
            return
        }
        this.disconnectToast = this.notifications.stickyWarning(
            `${this.etNotificationTitle} — ${this.translate.instant(_('Connection lost, attempting to resume the session...'))}`,
            this.translate.instant(_('Disconnected')),
        )
    }

    private dismissDisconnectToast (): void {
        this.disconnectToast?.dismiss()
        this.disconnectToast = null
    }

    private showServiceToast (msg: string): void {
        const text = stripAnsi(msg).replace(/\s+/g, ' ').trim()
        if (!text) {
            return
        }
        const title = this.etNotificationTitle
        if (text.startsWith('X ') || this.isErrorServiceMessage(text)) {
            this.notifications.error(text, title)
        } else if (text.startsWith('~ ') || /dropped/i.test(text)) {
            this.notifications.warning(text, title)
        } else {
            this.notifications.info(text, title)
        }
    }

    private isErrorServiceMessage (text: string): boolean {
        return /fail|refus|could not|rejected|terminated|too far|mismatch|error/i.test(text)
    }

    private get etNotificationTitle (): string {
        const o = this.profile.options
        return `${o.user}@${o.host}:${o.port}`
    }

    showPortForwarding (): void {
        if (!this.session) {
            return
        }
        const modal = this.ngbModal.open(ETPortForwardingModalComponent)
            .componentInstance as ETPortForwardingModalComponent
        modal.session = this.session
    }

    async canClose (): Promise<boolean> {
        if (!this.session?.open) {
            return true
        }
        if (!(this.profile.options.warnOnClose ?? this.config.store.et.warnOnClose)) {
            return true
        }
        return (await this.platform.showMessageBox({
            type: 'warning',
            message: this.translate.instant(
                _('Detach from {host}? The remote session will keep running.'),
                this.profile.options,
            ),
            buttons: [this.translate.instant(_('Detach')), this.translate.instant(_('Do not close'))],
            defaultId: 0,
            cancelId: 1,
        })).response === 0
    }

    protected isSessionExplicitlyTerminated (): boolean {
        return super.isSessionExplicitlyTerminated()
            || this.recentInputs.charCodeAt(this.recentInputs.length - 1) === 4
            || this.recentInputs.endsWith('exit\r')
    }

    @HostListener('click')
    onClick (): void {
        this.activeKIPrompt = null
    }
}
