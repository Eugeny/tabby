import { BehaviorSubject, ReplaySubject, Subject, Subscription } from 'rxjs'
import { Component, NgZone, Inject, ViewChild, HostBinding, Input } from '@angular/core'
import { AppService, ConfigService, BaseTabComponent } from 'terminus-core'

import { Session } from '../services/sessions.service'

import { TerminalDecorator, ResizeEvent } from '../api'
import { hterm, preferenceManager } from '../hterm'


@Component({
  selector: 'terminalTab',
  template: '<div #content class="content"></div>',
  styles: [require('./terminalTab.component.scss')],
})
export class TerminalTabComponent extends BaseTabComponent {
    hterm: any
    configSubscription: Subscription
    bell$ = new Subject()
    size$ = new ReplaySubject<ResizeEvent>(1)
    input$ = new Subject<string>()
    output$ = new Subject<string>()
    contentUpdated$ = new Subject<void>()
    alternateScreenActive$ = new BehaviorSubject(false)
    mouseEvent$ = new Subject<Event>()
    @Input() session: Session
    @ViewChild('content') content
    @HostBinding('style.background-color') backgroundColor: string
    private io: any

    constructor(
        private zone: NgZone,
        private app: AppService,
        public config: ConfigService,
        @Inject(TerminalDecorator) private decorators: TerminalDecorator[],
    ) {
        super()
        this.configSubscription = config.change.subscribe(() => {
            this.configure()
        })
    }

    getRecoveryToken (): any {
        return {
            type: 'app:terminal',
            recoveryId: this.session.recoveryId,
        }
    }

    ngOnInit () {
        this.focused$.subscribe(() => {
            this.hterm.scrollPort_.focus()
            this.hterm.scrollPort_.resize()
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
            this.session.output$.subscribe((data) => {
                this.zone.run(() => {
                    this.output$.next(data)
                })
                this.write(data)
            })
            this.session.closed$.first().subscribe(() => {
                this.app.closeTab(this)
            })

            this.session.releaseInitialDataBuffer()
        }
        this.hterm.decorate(this.content.nativeElement)
        this.configure()

        setTimeout(() => {
            this.output$.subscribe(() => {
                this.displayActivity()
            })
        }, 1000)

        this.bell$.subscribe(() => {
            if (this.config.store.terminal.bell != 'off') {
                let bg = preferenceManager.get('background-color')
                preferenceManager.set('background-color', 'rgba(128,128,128,.25)')
                setTimeout(() => {
                    preferenceManager.set('background-color', bg)
                }, 125)
            }
            // TODO audible
        })
    }

    attachHTermHandlers (hterm: any) {
        hterm.setWindowTitle = (title) => {
            this.zone.run(() => {
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

        const _onPaste_ = hterm.scrollPort_.onPaste_.bind(hterm.scrollPort_)
        hterm.scrollPort_.onPaste_ = (event) => {
            hterm.scrollPort_.pasteTarget_.value = event.clipboardData.getData('text/plain').trim()
            _onPaste_()
            event.preventDefault()
        }

        const _resize = hterm.scrollPort_.resize.bind(hterm.scrollPort_)
        hterm.scrollPort_.resize = () => {
            if (!this.hasFocus) {
                return
            }
            _resize()
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

        hterm.ringBell = () => {
            this.bell$.next()
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
                this.session.resize(columns, rows)
                this.size$.next({ width: columns, height: rows })
            })
        }
    }

    sendInput (data: string) {
        this.session.write(data)
    }

    write (data: string) {
        this.io.writeUTF8(data)
    }

    async configure (): Promise<void> {
        let config = this.config.store
        preferenceManager.set('font-family', config.terminal.font)
        preferenceManager.set('font-size', config.terminal.fontSize)
        preferenceManager.set('enable-bold', true)
        preferenceManager.set('audible-bell-sound', '')
        preferenceManager.set('desktop-notification-bell', config.terminal.bell == 'notification')
        preferenceManager.set('enable-clipboard-notice', false)
        preferenceManager.set('receive-encoding', 'raw')
        preferenceManager.set('send-encoding', 'raw')

        if (config.terminal.colorScheme.foreground) {
            preferenceManager.set('foreground-color', config.terminal.colorScheme.foreground)
        }
        if (config.terminal.background == 'colorScheme') {
            if (config.terminal.colorScheme.background) {
                this.backgroundColor = config.terminal.colorScheme.background
                preferenceManager.set('background-color', config.terminal.colorScheme.background)
            }
        } else {
            this.backgroundColor = null
            // hterm can't parse "transparent"
            preferenceManager.set('background-color', 'rgba(0,0,0,0)')
        }
        if (config.terminal.colorScheme.colors) {
            preferenceManager.set('color-palette-overrides', config.terminal.colorScheme.colors)
        }
        if (config.terminal.colorScheme.cursor) {
            preferenceManager.set('cursor-color', config.terminal.colorScheme.cursor)
        }

        this.hterm.setBracketedPaste(config.terminal.bracketedPaste)
    }

    ngOnDestroy () {
        this.decorators.forEach((decorator) => {
            decorator.detach(this)
        })
        this.configSubscription.unsubscribe()
        this.size$.complete()
        this.input$.complete()
        this.output$.complete()
        this.contentUpdated$.complete()
        this.alternateScreenActive$.complete()
        this.mouseEvent$.complete()
        this.bell$.complete()

        this.session.gracefullyDestroy()
    }
}
