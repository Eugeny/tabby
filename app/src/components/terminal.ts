import { Subscription } from 'rxjs'
import { Component, NgZone, Input, Output, EventEmitter, ElementRef } from '@angular/core'

import { ConfigService } from 'services/config'
import { PluginDispatcherService } from 'services/pluginDispatcher'
import { Session } from 'services/sessions'

const hterm = require('hterm-commonjs')
const dataurl = require('dataurl')


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
const preferenceManager = new hterm.hterm.PreferenceManager('default')
preferenceManager.set('user-css', dataurl.convert({
    data: require('./terminal.userCSS.scss'),
    mimetype: 'text/css',
    charset: 'utf8',
}))
preferenceManager.set('background-color', '#1D272D')
preferenceManager.set('color-palette-overrides', {
    0: '#1D272D',
})

const oldDecorate = hterm.hterm.ScrollPort.prototype.decorate
hterm.hterm.ScrollPort.prototype.decorate = function (...args) {
    oldDecorate.bind(this)(...args)
    this.screen_.style.cssText += `; padding-right: ${this.screen_.offsetWidth - this.screen_.clientWidth}px;`
}

hterm.hterm.Terminal.prototype.showOverlay = () => null

@Component({
  selector: 'terminal',
  template: '',
  styles: [require('./terminal.scss')],
})
export class TerminalComponent {
    @Input() session: Session
    title: string
    @Output() titleChange = new EventEmitter()
    terminal: any
    configSubscription: Subscription

    constructor(
        private zone: NgZone,
        private elementRef: ElementRef,
        public config: ConfigService,
        private pluginDispatcher: PluginDispatcherService,
    ) {
        this.configSubscription = config.change.subscribe(() => {
            this.configure()
        })
    }

    ngOnInit () {
        let io
        this.terminal = new hterm.hterm.Terminal()
        this.pluginDispatcher.emit('preTerminalInit', { terminal: this.terminal })
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

            this.session.releaseInitialDataBuffer()
        }
        this.terminal.decorate(this.elementRef.nativeElement)
        this.configure()
        this.pluginDispatcher.emit('postTerminalInit', { terminal: this.terminal })
    }

    configure () {
        let config = this.config.full()
        preferenceManager.set('font-family', config.appearance.font)
        preferenceManager.set('font-size', config.appearance.fontSize)
        preferenceManager.set('audible-bell-sound', '')
        preferenceManager.set('desktop-notification-bell', config.terminal.bell == 'notification')
        preferenceManager.set('enable-clipboard-notice', false)
    }

    ngOnDestroy () {
        this.configSubscription.unsubscribe()
    }
}
