import colors from 'ansi-colors'
import { Spinner } from 'cli-spinner'
import { Component } from '@angular/core'
// import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { first } from 'rxjs/operators'
import { BaseTerminalTabComponent } from 'terminus-terminal'
import { SerialService } from '../services/serial.service'
import { SerialConnection, SerialSession } from '../api'
import { Subscription } from 'rxjs'

/** @hidden */
@Component({
    selector: 'serial-tab',
    template: BaseTerminalTabComponent.template + require<string>('./serialTab.component.pug'),
    styles: [require('./serialTab.component.scss'), ...BaseTerminalTabComponent.styles],
    animations: BaseTerminalTabComponent.animations,
})
export class SerialTabComponent extends BaseTerminalTabComponent {
    connection: SerialConnection
    serial: SerialService
    session: SerialSession
    // private ngbModal: NgbModal
    private homeEndSubscription: Subscription

    ngOnInit () {
        // this.ngbModal = this.injector.get<NgbModal>(NgbModal)

        this.logger = this.log.create('terminalTab')
        this.serial = this.injector.get(SerialService)

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
            this.setTitle(this.connection.name)
        })
    }

    async initializeSession () {
        if (!this.connection) {
            this.logger.error('No Serial connection info supplied')
            return
        }

        this.session = this.serial.createSession(this.connection)
        this.session.serviceMessage$.subscribe(msg => {
            this.write('\r\n' + colors.black.bgWhite(' serial ') + ' ' + msg + '\r\n')
            this.session.resize(this.size.columns, this.size.rows)
        })
        this.attachSessionHandlers()
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
            await this.serial.connectSession(this.session, (message: string) => {
                spinner.stop(true)
                this.write(message + '\r\n')
                spinner.start()
            })
            spinner.stop(true)
        } catch (e) {
            spinner.stop(true)
            this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
            return
        }
        await this.session.start()
        this.session.resize(this.size.columns, this.size.rows)
    }

    async getRecoveryToken (): Promise<any> {
        return {
            type: 'app:serial-tab',
            connection: this.connection,
            savedState: this.frontend?.saveState(),
        }
    }

    reconnect () {
        this.initializeSession()
    }

    ngOnDestroy () {
        this.homeEndSubscription.unsubscribe()
        super.ngOnDestroy()
    }
}
