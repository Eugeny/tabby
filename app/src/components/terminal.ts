import { Component, Input, ElementRef } from '@angular/core'
import { ElectronService } from 'services/electron'
import { ConfigService } from 'services/config'

import { Session } from 'services/sessions'

const hterm = require('hterm-commonjs')


@Component({
  selector: 'terminal',
  template: '',
  styles: [require('./terminal.less')],
})
export class TerminalComponent {
    @Input() session: Session
    private terminal: any

    constructor(
        private electron: ElectronService,
        private elementRef: ElementRef,
        public config: ConfigService,
    ) {
    }

    ngOnInit () {
        let io
        hterm.hterm.defaultStorage = new hterm.lib.Storage.Memory()
        this.terminal = new hterm.hterm.Terminal()
        this.terminal.onTerminalReady = () => {
            this.terminal.installKeyboard()
            io = this.terminal.io.push()
            const dataSubscription = this.session.dataAvailable.subscribe((data) => {
                io.writeUTF8(data)
            })
            const closedSubscription = this.session.closed.subscribe(() => {
                dataSubscription.unsubscribe()
                closedSubscription.unsubscribe()
            })
            io.onVTKeystroke = (str) => {
                this.session.write(str)
            }
            io.sendString = (str) => {
                this.session.write(str)
            }
            io.onTerminalResize = (columns, rows) => {
                this.session.resize(columns, rows)
            }
        }
        this.terminal.decorate(this.elementRef.nativeElement)
    }

    ngOnDestroy () {
    }
}
