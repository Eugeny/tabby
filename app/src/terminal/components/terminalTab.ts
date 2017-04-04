import { BehaviorSubject, ReplaySubject, Subject, Subscription } from 'rxjs'
import { Component, NgZone, Inject, ElementRef } from '@angular/core'

import { ConfigService } from 'services/config'

import { BaseTabComponent } from 'components/baseTab'
import { TerminalTab } from '../tab'
import { TerminalDecorator, ResizeEvent } from '../api'

import { hterm, preferenceManager } from '../hterm'


@Component({
  selector: 'terminalTab',
  template: '',
  styles: [require('./terminalTab.scss')],
})
export class TerminalTabComponent extends BaseTabComponent<TerminalTab> {
    hterm: any
    configSubscription: Subscription
    focusedSubscription: Subscription
    startupTime: number
    title$ = new BehaviorSubject('')
    size$ = new ReplaySubject<ResizeEvent>(1)
    input$ = new Subject<string>()
    output$ = new Subject<string>()
    contentUpdated$ = new Subject<void>()

    constructor(
        private zone: NgZone,
        private elementRef: ElementRef,
        public config: ConfigService,
        @Inject(TerminalDecorator) private decorators: TerminalDecorator[],
    ) {
        super()
        this.startupTime = performance.now()
        this.configSubscription = config.change.subscribe(() => {
            this.configure()
        })
    }

    initTab () {
        this.focusedSubscription = this.model.focused.subscribe(() => {
            this.hterm.scrollPort_.focus()
        })

        this.hterm = new hterm.hterm.Terminal()
        this.decorators.forEach((decorator) => {
            decorator.attach(this)
        })

        this.attachHTermHandlers(this.hterm)

        this.hterm.onTerminalReady = () => {
            this.hterm.installKeyboard()
            let io = this.hterm.io.push()
            this.attachIOHandlers(io)
            const dataSubscription = this.model.session.dataAvailable.subscribe((data) => {
                if (performance.now() - this.startupTime > 500)  {
                    this.zone.run(() => {
                        this.model.displayActivity()
                    })
                }
                this.zone.run(() => {
                    this.output$.next(data)
                })
                io.writeUTF8(data)
            })
            const closedSubscription = this.model.session.closed.subscribe(() => {
                dataSubscription.unsubscribe()
                closedSubscription.unsubscribe()
            })

            this.model.session.releaseInitialDataBuffer()
        }
        this.hterm.decorate(this.elementRef.nativeElement)
        this.configure()
    }

    attachHTermHandlers (hterm: any) {
        hterm.setWindowTitle = (title) => {
            this.zone.run(() => {
                this.model.title = title
                this.title$.next(title)
            })
        }

        const oldInsertString = hterm.screen_.insertString.bind(hterm.screen_)
        hterm.screen_.insertString = (data) => {
            oldInsertString(data)
            this.contentUpdated$.next()
        }

        const oldDeleteChars = hterm.screen_.deleteChars.bind(hterm.screen_)
        hterm.screen_.deleteChars = (count) => {
            let ret = oldDeleteChars(count)
            this.contentUpdated$.next()
            return ret
        }
    }

    attachIOHandlers (io: any) {
        io.onVTKeystroke = io.sendString = (data) => {
            this.model.session.write(data)
            this.zone.run(() => {
                this.input$.next(data)
            })
        }
        io.onTerminalResize = (columns, rows) => {
            // console.log(`Resizing to ${columns}x${rows}`)
            this.zone.run(() => {
                this.model.session.resize(columns, rows)
                this.size$.next({ width: columns, height: rows })
            })
        }
    }

    configure () {
        let config = this.config.full()
        preferenceManager.set('font-family', config.terminal.font)
        preferenceManager.set('font-size', config.terminal.fontSize)
        preferenceManager.set('audible-bell-sound', '')
        preferenceManager.set('desktop-notification-bell', config.terminal.bell == 'notification')
        preferenceManager.set('enable-clipboard-notice', false)
        preferenceManager.set('receive-encoding', 'raw')
        preferenceManager.set('send-encoding', 'raw')
        this.hterm.setBracketedPaste(config.terminal.bracketedPaste)
    }

    ngOnDestroy () {
        this.decorators.forEach((decorator) => {
            decorator.detach(this)
        })
        this.focusedSubscription.unsubscribe()
        this.configSubscription.unsubscribe()
    }
}
