import { Component, NgZone, Input, Output, EventEmitter, ElementRef } from '@angular/core'
import { ConfigService } from 'services/config'

import { Session } from 'services/sessions'

const hterm = require('hterm-commonjs')


hterm.hterm.VT.ESC['k'] = function(parseState) {
    parseState.resetArguments();

    function parseOSC(ps) {
        if (!this.parseUntilStringTerminator_(ps) || ps.func == parseOSC) {
            return
        }

        this.terminal.setWindowTitle(ps.args[0])
    }
    parseState.func = parseOSC
}

hterm.hterm.defaultStorage = new hterm.lib.Storage.Memory()
hterm.hterm.PreferenceManager.defaultPreferences['user-css'] = ``
const oldDecorate = hterm.hterm.ScrollPort.prototype.decorate
hterm.hterm.ScrollPort.prototype.decorate = function (...args) {
    oldDecorate.bind(this)(...args)
    this.screen_.style.cssText += `; padding-right: ${this.screen_.offsetWidth - this.screen_.clientWidth}px;`
}


@Component({
  selector: 'terminal',
  template: '',
  styles: [require('./terminal.less')],
})
export class TerminalComponent {
    @Input() session: Session
    title: string
    @Output() titleChange = new EventEmitter()
    private terminal: any

    constructor(
        private zone: NgZone,
        private elementRef: ElementRef,
        public config: ConfigService,
    ) {
    }

    ngOnInit () {
        let io
        this.terminal = new hterm.hterm.Terminal()
        this.terminal.setWindowTitle = (title) => {
            this.zone.run(() => {
                this.title = title
                this.titleChange.emit(title)
            })
        }
        this.terminal.onTerminalReady = () => {
            this.terminal.installKeyboard()
            io = this.terminal.io.push()
            const dataSubscription = this.session.dataAvailable.subscribe((data) => {
                io.writeUTF16(data)
            })
            const closedSubscription = this.session.closed.subscribe(() => {
                dataSubscription.unsubscribe()
                closedSubscription.unsubscribe()
            })

            io.onVTKeystroke = io.sendString = (str) => {
                this.session.write(str)
            }
            io.onTerminalResize = (columns, rows) => {
                console.log(`Resizing to ${columns}x${rows}`)
                this.session.resize(columns, rows)
            }
        }
        this.terminal.decorate(this.elementRef.nativeElement)
    }

    ngOnDestroy () {
        ;
    }
}
