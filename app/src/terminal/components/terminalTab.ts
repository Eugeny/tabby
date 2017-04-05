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
    title$ = new BehaviorSubject('')
    size$ = new ReplaySubject<ResizeEvent>(1)
    input$ = new Subject<string>()
    output$ = new Subject<string>()
    contentUpdated$ = new Subject<void>()
    alternateScreenActive$ = new BehaviorSubject(false)
    mouseEvent$ = new Subject<Event>()
    private io: any

    constructor(
        private zone: NgZone,
        private elementRef: ElementRef,
        public config: ConfigService,
        @Inject(TerminalDecorator) private decorators: TerminalDecorator[],
    ) {
        super()
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
            this.io = this.hterm.io.push()
            this.attachIOHandlers(this.io)
            const dataSubscription = this.model.session.dataAvailable.subscribe((data) => {
                this.zone.run(() => {
                    this.output$.next(data)
                })
                this.write(data)
            })
            const closedSubscription = this.model.session.closed.subscribe(() => {
                dataSubscription.unsubscribe()
                closedSubscription.unsubscribe()
            })

            this.model.session.releaseInitialDataBuffer()
        }
        this.hterm.decorate(this.elementRef.nativeElement)
        this.configure()

        setTimeout(() => {
            this.output$.subscribe(() => {
                this.model.displayActivity()
            })
        }, 1000)
    }

    attachHTermHandlers (hterm: any) {
        hterm.setWindowTitle = (title) => {
            this.zone.run(() => {
                this.model.title = title
                this.title$.next(title)
            })
        }

        const _decorate = hterm.scrollPort_.decorate.bind(hterm.scrollPort_)
        hterm.scrollPort_.decorate = (...args) => {
            _decorate(...args)
            hterm.scrollPort_.screen_.style.cssText += `; padding-right: ${hterm.scrollPort_.screen_.offsetWidth - hterm.scrollPort_.screen_.clientWidth}px;`
        }

        const _setAlternateMode = hterm.setAlternateMode.bind(hterm)
        hterm.setAlternateMode = (state) => {
            _setAlternateMode(state)
            this.alternateScreenActive$.next(state)
        }

        const _onPaste_ = hterm.onPaste_.bind(hterm)
        hterm.onPaste_ = (event) => {
            event.text = event.text.trim()
            _onPaste_(event)
        }

        const _onMouse_ = hterm.onMouse_.bind(hterm)
        hterm.onMouse_ = (event) => {
            this.mouseEvent$.next(event)
            if ((event.ctrlKey || event.metaKey) && event.type === 'mousewheel') {
                event.preventDefault()
                let delta = Math.round(event.wheelDeltaY / 50)
                this.sendInput(((delta > 0) ? '\u001bOA' : '\u001bOB').repeat(Math.abs(delta)))
            }
            _onMouse_(event)
        }

        for (let screen of [hterm.primaryScreen_, hterm.alternateScreen_]) {
            const _insertString = screen.insertString.bind(screen)
            screen.insertString = (data) => {
                _insertString(data)
                this.contentUpdated$.next()
            }

            const _deleteChars = screen.deleteChars.bind(screen)
            screen.deleteChars = (count) => {
                let ret = _deleteChars(count)
                this.contentUpdated$.next()
                return ret
            }
        }
    }

    attachIOHandlers (io: any) {
        io.onVTKeystroke = io.sendString = (data) => {
            this.sendInput(data)
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

    sendInput (data: string) {
        this.model.session.write(data)
    }

    write (data: string) {
        this.io.writeUTF8(data)
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
        this.title$.complete()
        this.size$.complete()
        this.input$.complete()
        this.output$.complete()
        this.contentUpdated$.complete()
        this.alternateScreenActive$.complete()
        this.mouseEvent$.complete()
    }
}
