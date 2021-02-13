/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import colors from 'ansi-colors'
import { Spinner } from 'cli-spinner'
import { Component, Injector } from '@angular/core'
import { first } from 'rxjs/operators'
import { BaseTerminalTabComponent } from 'terminus-terminal'
import { SerialService } from '../services/serial.service'
import { SerialConnection, SerialSession, BAUD_RATES } from '../api'
import { Subscription } from 'rxjs'

/** @hidden */
@Component({
    selector: 'serial-tab',
    template: `${BaseTerminalTabComponent.template} ${require('./serialTab.component.pug')}`,
    styles: [require('./serialTab.component.scss'), ...BaseTerminalTabComponent.styles],
    animations: BaseTerminalTabComponent.animations,
})
export class SerialTabComponent extends BaseTerminalTabComponent {
    connection?: SerialConnection
    session: SerialSession|null = null
    serialPort: any
    private serialService: SerialService
    private homeEndSubscription: Subscription

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        injector: Injector,
    ) {
        super(injector)
        this.serialService = injector.get(SerialService)
    }

    ngOnInit () {
        this.logger = this.log.create('terminalTab')

        this.homeEndSubscription = this.hotkeys.matchedHotkey.subscribe(hotkey => {
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
            }
        })

        this.frontendReady$.pipe(first()).subscribe(() => {
            this.initializeSession()
        })

        super.ngOnInit()

        setImmediate(() => {
            this.setTitle(this.connection!.name)
        })
    }

    async initializeSession () {
        if (!this.connection) {
            this.logger.error('No Serial connection info supplied')
            return
        }

        const session = this.serialService.createSession(this.connection)
        this.setSession(session)
        this.write(`Connecting to `)

        const spinner = new Spinner({
            text: 'Connecting',
            stream: {
                write: x => this.write(x),
            },
        })
        spinner.setSpinnerString(6)
        spinner.start()

        try {
            this.serialPort = await this.serialService.connectSession(this.session!)
            spinner.stop(true)
            session.emitServiceMessage('Port opened')
        } catch (e) {
            spinner.stop(true)
            this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
            return
        }
        await this.session!.start()
        this.session!.resize(this.size.columns, this.size.rows)
    }

    protected attachSessionHandlers () {
        this.attachSessionHandler(this.session!.serviceMessage$.subscribe(msg => {
            this.write(`\r\n${colors.black.bgWhite(' Serial ')} ${msg}\r\n`)
            this.session?.resize(this.size.columns, this.size.rows)
        }))
        this.attachSessionHandler(this.session!.destroyed$.subscribe(() => {
            this.write('Press any key to reconnect\r\n')
            this.input$.pipe(first()).subscribe(() => {
                if (!this.session?.open) {
                    this.reconnect()
                }
            })
        }))
        super.attachSessionHandlers()
    }

    async getRecoveryToken (): Promise<any> {
        return {
            type: 'app:serial-tab',
            connection: this.connection,
            savedState: this.frontend?.saveState(),
        }
    }

    async reconnect (): Promise<void> {
        this.session?.destroy()
        await this.initializeSession()
        this.session?.releaseInitialDataBuffer()
    }

    async changeBaudRate () {
        const rate = await this.app.showSelector('Baud rate', BAUD_RATES.map(x => ({
            name: x.toString(), result: x,
        })))
        this.serialPort.update({ baudRate: rate })
        this.connection!.baudrate = rate
    }

    ngOnDestroy () {
        this.homeEndSubscription.unsubscribe()
        super.ngOnDestroy()
    }
}
