const dataurl = require('dataurl')
import { BehaviorSubject, Subject, Subscription } from 'rxjs'
import 'rxjs/add/operator/bufferTime'
import { Component, NgZone, Inject, Optional, ViewChild, HostBinding, Input } from '@angular/core'
import { AppService, ConfigService, BaseTabComponent, ThemesService, HostAppService, HotkeysService, Platform } from 'terminus-core'

import { Session, SessionsService } from '../services/sessions.service'

import { TerminalDecorator, ResizeEvent, SessionOptions } from '../api'
import { hterm, preferenceManager } from '../hterm'

@Component({
    selector: 'terminalTab',
    template: '<div #content class="content" [style.opacity]="htermVisible ? 1 : 0"></div>',
    styles: [require('./terminalTab.component.scss')],
})
export class TerminalTabComponent extends BaseTabComponent {
    session: Session
    @Input() sessionOptions: SessionOptions
    @Input() zoom = 0
    @ViewChild('content') content
    @HostBinding('style.background-color') backgroundColor: string
    hterm: any
    configSubscription: Subscription
    sessionCloseSubscription: Subscription
    hotkeysSubscription: Subscription
    bell$ = new Subject()
    size: ResizeEvent
    resize$ = new Subject<ResizeEvent>()
    input$ = new Subject<string>()
    output$ = new Subject<string>()
    contentUpdated$ = new Subject<void>()
    alternateScreenActive$ = new BehaviorSubject(false)
    mouseEvent$ = new Subject<Event>()
    htermVisible = false
    private io: any

    constructor (
        private zone: NgZone,
        private app: AppService,
        private themes: ThemesService,
        private hostApp: HostAppService,
        private hotkeys: HotkeysService,
        private sessions: SessionsService,
        public config: ConfigService,
        @Optional() @Inject(TerminalDecorator) private decorators: TerminalDecorator[],
    ) {
        super()
        this.decorators = this.decorators || []
        this.title$.next('Terminal')
        this.configSubscription = config.changed$.subscribe(() => {
            this.configure()
        })
        this.resize$.first().subscribe(async (resizeEvent) => {
            this.session = this.sessions.addSession(
                Object.assign({}, this.sessionOptions, resizeEvent)
            )
            // this.session.output$.bufferTime(10).subscribe((datas) => {
            this.session.output$.subscribe(data => {
                // let data = datas.join('')
                this.zone.run(() => {
                    this.output$.next(data)
                })
                this.write(data)
            })
            this.sessionCloseSubscription = this.session.closed$.subscribe(() => {
                this.app.closeTab(this)
            })
            this.session.releaseInitialDataBuffer()
        })
        this.hotkeysSubscription = this.hotkeys.matchedHotkey.subscribe(hotkey => {
            if (!this.hasFocus) {
                return
            }
            if (hotkey === 'copy') {
                this.hterm.copySelectionToClipboard()
            }
            if (hotkey === 'clear') {
                this.clear()
            }
            if (hotkey === 'zoom-in') {
                this.zoomIn()
            }
            if (hotkey === 'zoom-out') {
                this.zoomOut()
            }
            if (hotkey === 'reset-zoom') {
                this.resetZoom()
            }
        })
    }

    getRecoveryToken (): any {
        return {
            type: 'app:terminal',
            recoveryId: this.sessionOptions.recoveryId,
        }
    }

    ngOnInit () {
        this.focused$.subscribe(() => {
            setTimeout(() => {
                this.hterm.scrollPort_.resize()
                this.hterm.scrollPort_.focus()
            }, 100)
        })

        this.hterm = new hterm.hterm.Terminal()
        this.decorators.forEach((decorator) => {
            decorator.attach(this)
        })

        this.attachHTermHandlers(this.hterm)

        this.hterm.onTerminalReady = () => {
            this.htermVisible = true
            this.hterm.installKeyboard()
            this.hterm.scrollPort_.setCtrlVPaste(true)
            this.io = this.hterm.io.push()
            this.attachIOHandlers(this.io)
        }
        this.hterm.decorate(this.content.nativeElement)
        this.configure()

        setTimeout(() => {
            this.output$.subscribe(() => {
                this.displayActivity()
            })
        }, 1000)

        this.bell$.subscribe(() => {
            if (this.config.store.terminal.bell !== 'off') {
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

        const _setAlternateMode = hterm.setAlternateMode.bind(hterm)
        hterm.setAlternateMode = (state) => {
            _setAlternateMode(state)
            this.alternateScreenActive$.next(state)
        }

        hterm.primaryScreen_.syncSelectionCaret = () => null
        hterm.alternateScreen_.syncSelectionCaret = () => null
        hterm.primaryScreen_.terminal = hterm
        hterm.alternateScreen_.terminal = hterm

        const _onPaste = hterm.scrollPort_.onPaste_.bind(hterm.scrollPort_)
        hterm.scrollPort_.onPaste_ = (event) => {
            hterm.scrollPort_.pasteTarget_.value = event.clipboardData.getData('text/plain').trim()
            _onPaste()
            event.preventDefault()
        }

        const _resize = hterm.scrollPort_.resize.bind(hterm.scrollPort_)
        hterm.scrollPort_.resize = () => {
            if (!this.hasFocus) {
                return
            }
            _resize()
        }

        const _onMouse = hterm.onMouse_.bind(hterm)
        hterm.onMouse_ = (event) => {
            this.mouseEvent$.next(event)
            if (event.type === 'mousewheel') {
                if (event.ctrlKey || event.metaKey) {
                    if (event.wheelDeltaY < 0) {
                        this.zoomIn()
                    } else {
                        this.zoomOut()
                    }
                } else if (event.altKey) {
                    event.preventDefault()
                    let delta = Math.round(event.wheelDeltaY / 50)
                    this.sendInput(((delta > 0) ? '\u001bOA' : '\u001bOB').repeat(Math.abs(delta)))
                }
            }
            _onMouse(event)
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
                this.size = { width: columns, height: rows }
                if (this.session) {
                    this.session.resize(columns, rows)
                }
                this.resize$.next(this.size)
            })
        }
    }

    sendInput (data: string) {
        this.session.write(data)
    }

    write (data: string) {
        this.io.writeUTF8(data)
    }

    clear () {
        this.hterm.wipeContents()
        this.hterm.onVTKeystroke('\f')
    }

    async configure (): Promise<void> {
        let config = this.config.store
        preferenceManager.set('font-family', `"${config.terminal.font}", "monospace-fallback", monospace`)
        this.setFontSize()
        preferenceManager.set('enable-bold', true)
        preferenceManager.set('audible-bell-sound', '')
        preferenceManager.set('desktop-notification-bell', config.terminal.bell === 'notification')
        preferenceManager.set('enable-clipboard-notice', false)
        preferenceManager.set('receive-encoding', 'raw')
        preferenceManager.set('send-encoding', 'raw')
        preferenceManager.set('ctrl-plus-minus-zero-zoom', false)
        preferenceManager.set('scrollbar-visible', this.hostApp.platform === Platform.macOS)
        preferenceManager.set('copy-on-select', false)

        if (config.terminal.colorScheme.foreground) {
            preferenceManager.set('foreground-color', config.terminal.colorScheme.foreground)
        }
        if (config.terminal.background === 'colorScheme') {
            if (config.terminal.colorScheme.background) {
                this.backgroundColor = config.terminal.colorScheme.background
                preferenceManager.set('background-color', config.terminal.colorScheme.background)
            }
        } else {
            this.backgroundColor = null
            // hterm can't parse "transparent"
            preferenceManager.set('background-color', this.themes.findCurrentTheme().terminalBackground)
        }
        if (config.terminal.colorScheme.colors) {
            preferenceManager.set('color-palette-overrides', config.terminal.colorScheme.colors)
        }
        if (config.terminal.colorScheme.cursor) {
            preferenceManager.set('cursor-color', config.terminal.colorScheme.cursor)
        }

        let css = require('../hterm.userCSS.scss')
        if (!config.terminal.ligatures) {
            css += `
                * {
                    font-feature-settings: "liga" 0;
                    font-variant-ligatures: none;
                }
            `
        } else {
            css += `
                * {
                    font-feature-settings: "liga" 1;
                    font-variant-ligatures: initial;
                }
            `
        }
        preferenceManager.set('user-css', dataurl.convert({
            data: css,
            mimetype: 'text/css',
            charset: 'utf8',
        }))

        this.hterm.setBracketedPaste(config.terminal.bracketedPaste)
    }

    zoomIn () {
        this.zoom++
        this.setFontSize()
    }

    zoomOut () {
        this.zoom--
        this.setFontSize()
    }

    resetZoom () {
        this.zoom = 0
        this.setFontSize()
    }

    ngOnDestroy () {
        this.decorators.forEach(decorator => {
            decorator.detach(this)
        })
        this.configSubscription.unsubscribe()
        this.hotkeysSubscription.unsubscribe()
        if (this.sessionCloseSubscription) {
            this.sessionCloseSubscription.unsubscribe()
        }
        this.resize$.complete()
        this.input$.complete()
        this.output$.complete()
        this.contentUpdated$.complete()
        this.alternateScreenActive$.complete()
        this.mouseEvent$.complete()
        this.bell$.complete()
    }

    async destroy () {
        super.destroy()
        if (this.session && this.session.open) {
            await this.session.destroy()
        }
    }

    private setFontSize () {
        preferenceManager.set('font-size', this.config.store.terminal.fontSize * Math.pow(1.1, this.zoom))
    }
}
