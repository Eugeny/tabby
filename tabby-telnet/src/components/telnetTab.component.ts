import colors from 'ansi-colors'
import { Component, Injector } from '@angular/core'
import { first } from 'rxjs'
import { Platform, RecoveryToken } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { TelnetProfile, TelnetSession } from '../session'


/** @hidden */
@Component({
    selector: 'telnet-tab',
    template: `${BaseTerminalTabComponent.template} ${require('./telnetTab.component.pug')}`,
    styles: [require('./telnetTab.component.scss'), ...BaseTerminalTabComponent.styles],
    animations: BaseTerminalTabComponent.animations,
})
export class TelnetTabComponent extends BaseTerminalTabComponent {
    Platform = Platform
    profile?: TelnetProfile
    session: TelnetSession|null = null
    private reconnectOffered = false

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        injector: Injector,
    ) {
        super(injector)
        this.enableToolbar = true
    }

    ngOnInit (): void {
        if (!this.profile) {
            throw new Error('Profile not set')
        }

        this.logger = this.log.create('telnetTab')

        this.subscribeUntilDestroyed(this.hotkeys.hotkey$, hotkey => {
            if (this.hasFocus && hotkey === 'restart-telnet-session') {
                this.reconnect()
            }
        })

        this.frontendReady$.pipe(first()).subscribe(() => {
            this.initializeSession()
        })

        super.ngOnInit()
    }

    protected attachSessionHandlers (): void {
        const session = this.session!
        this.attachSessionHandler(session.destroyed$, () => {
            if (this.frontend) {
                // Session was closed abruptly
                if (!this.reconnectOffered) {
                    this.reconnectOffered = true
                    this.write('Press any key to reconnect\r\n')
                    this.input$.pipe(first()).subscribe(() => {
                        if (!this.session?.open && this.reconnectOffered) {
                            this.reconnect()
                        }
                    })
                }
            }
        })
        super.attachSessionHandlers()
    }

    async initializeSession (): Promise<void> {
        this.reconnectOffered = false
        if (!this.profile) {
            this.logger.error('No Telnet connection info supplied')
            return
        }

        const session = new TelnetSession(this.injector, this.profile)
        this.setSession(session)

        try {
            this.startSpinner('Connecting')

            this.attachSessionHandler(session.serviceMessage$, msg => {
                this.write(`\r${colors.black.bgWhite(' Telnet ')} ${msg}\r\n`)
                session.resize(this.size.columns, this.size.rows)
            })

            try {
                await session.start()
                this.stopSpinner()
            } catch (e) {
                this.stopSpinner()
                this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
                return
            }
        } catch (e) {
            this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
        }
    }

    async getRecoveryToken (): Promise<RecoveryToken> {
        return {
            type: 'app:telnet-tab',
            profile: this.profile,
            savedState: this.frontend?.saveState(),
        }
    }

    async reconnect (): Promise<void> {
        this.session?.destroy()
        await this.initializeSession()
        this.session?.releaseInitialDataBuffer()
    }

    async canClose (): Promise<boolean> {
        if (!this.session?.open) {
            return true
        }
        return (await this.platform.showMessageBox(
            {
                type: 'warning',
                message: `Disconnect from ${this.profile?.options.host}?`,
                buttons: ['Disconnect', 'Do not close'],
                defaultId: 0,
                cancelId: 1,
            }
        )).response === 0
    }
}
