/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import colors from 'ansi-colors'
import { Component, Injector } from '@angular/core'
import { first } from 'rxjs'
import { GetRecoveryTokenOptions, Platform, SelectorService } from 'tabby-core'
import { BaseTerminalTabComponent, Reconnectable } from 'tabby-terminal'
import { SerialSession, BAUD_RATES, SerialProfile } from '../api'

/** @hidden */
@Component({
    selector: 'serial-tab',
    template: `${BaseTerminalTabComponent.template} ${require('./serialTab.component.pug')}`,
    styleUrls: ['./serialTab.component.scss', ...BaseTerminalTabComponent.styles],
    animations: BaseTerminalTabComponent.animations,
})
export class SerialTabComponent extends BaseTerminalTabComponent<SerialProfile> implements Reconnectable {
    session: SerialSession|null = null
    Platform = Platform

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        injector: Injector,
        private selector: SelectorService,
    ) {
        super(injector)
        this.enableToolbar = true
    }

    ngOnInit () {
        this.logger = this.log.create('terminalTab')

        this.subscribeUntilDestroyed(this.hotkeys.hotkey$, hotkey => {
            if (!this.hasFocus) {
                return
            }
            switch (hotkey) {
                case 'home':
                    this.sendInput('\x1b[H' )
                    break
                case 'end':
                    this.sendInput('\x1b[F' )
                    break
                case 'restart-serial-session':
                    this.reconnect()
                    break
            }
        })

        this.frontendReady$.pipe(first()).subscribe(() => {
            this.initializeSession()
        })

        super.ngOnInit()

        setImmediate(() => {
            this.setTitle(this.profile.name)
        })
    }

    async initializeSession () {
        const session = new SerialSession(this.injector, this.profile)
        this.setSession(session)

        this.startSpinner(this.translate.instant(_('Connecting')))

        try {
            await this.session!.start()
            this.stopSpinner()
            session.emitServiceMessage(this.translate.instant(_('Port opened')))
        } catch (e) {
            this.stopSpinner()
            this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
            return
        }
        this.session!.resize(this.size.columns, this.size.rows)
    }

    protected attachSessionHandlers () {
        this.attachSessionHandler(this.session!.serviceMessage$, msg => {
            this.write(`\r\n${colors.black.bgWhite(' Serial ')} ${msg}\r\n`)
            this.session?.resize(this.size.columns, this.size.rows)
        })
        this.attachSessionHandler(this.session!.destroyed$, () => {
            if (this.frontend) {
                // Session was closed abruptly
                if (this.config.store.terminal.behaviorOnSessionEnds === 'close') {
                    // Close the tab
                    this.destroy()
                } else if (this.config.store.terminal.behaviorOnSessionEnds.startsWith('reconnect-or-')) {
                    // Automatically reconnect the session
                    this.reconnect()
                } else {
                    // Reconnect Offer
                    this.write(this.translate.instant(_('Press any key to reconnect')) + '\r\n')
                    this.input$.pipe(first()).subscribe(() => {
                        if (!this.session?.open) {
                            this.reconnect()
                        }
                    })
                }
            }

        })
        super.attachSessionHandlers()
    }

    async getRecoveryToken (options?: GetRecoveryTokenOptions): Promise<any> {
        return {
            type: 'app:serial-tab',
            profile: this.profile,
            savedState: options?.includeState && this.frontend?.saveState(),
        }
    }

    async reconnect (): Promise<void> {
        this.session?.destroy()
        await this.initializeSession()
        this.session?.releaseInitialDataBuffer()
    }

    async changeBaudRate () {
        const rate = await this.selector.show(
            this.translate.instant(_('Baud rate')),
            BAUD_RATES.map(x => ({
                name: x.toString(), result: x,
            })),
        )
        this.session?.serial?.update({ baudRate: rate })
        this.profile.options.baudrate = rate
    }
}
