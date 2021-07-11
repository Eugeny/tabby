/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import colors from 'ansi-colors'
import { Component, Injector } from '@angular/core'
import { first } from 'rxjs'
import { Platform, SelectorService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { SerialSession, BAUD_RATES, SerialProfile } from '../api'

/** @hidden */
@Component({
    selector: 'serial-tab',
    template: `${BaseTerminalTabComponent.template} ${require('./serialTab.component.pug')}`,
    styles: [require('./serialTab.component.scss'), ...BaseTerminalTabComponent.styles],
    animations: BaseTerminalTabComponent.animations,
})
export class SerialTabComponent extends BaseTerminalTabComponent {
    profile?: SerialProfile
    session: SerialSession|null = null
    serialPort: any
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
            this.setTitle(this.profile!.name)
        })
    }

    async initializeSession () {
        if (!this.profile) {
            this.logger.error('No serial profile info supplied')
            return
        }

        const session = new SerialSession(this.injector, this.profile)
        this.setSession(session)
        this.write(`Connecting to `)

        this.startSpinner('Connecting')

        try {
            await this.session!.start()
            this.stopSpinner()
            session.emitServiceMessage('Port opened')
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
            this.write('Press any key to reconnect\r\n')
            this.input$.pipe(first()).subscribe(() => {
                if (!this.session?.open) {
                    this.reconnect()
                }
            })
        })
        super.attachSessionHandlers()
    }

    async getRecoveryToken (): Promise<any> {
        return {
            type: 'app:serial-tab',
            profile: this.profile,
            savedState: this.frontend?.saveState(),
        }
    }

    async reconnect (): Promise<void> {
        this.session?.destroy()
        await this.initializeSession()
        this.session?.releaseInitialDataBuffer()
    }

    async changeBaudRate () {
        const rate = await this.selector.show('Baud rate', BAUD_RATES.map(x => ({
            name: x.toString(), result: x,
        })))
        this.serialPort.update({ baudRate: rate })
        this.profile!.options.baudrate = rate
    }
}
