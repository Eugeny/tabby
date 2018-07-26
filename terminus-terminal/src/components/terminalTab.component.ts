import { Observable, BehaviorSubject, Subject, Subscription } from 'rxjs'
import { first } from 'rxjs/operators'
import { ToastrService } from 'ngx-toastr'
import { Component, NgZone, Inject, Optional, ViewChild, HostBinding, Input } from '@angular/core'
import { AppService, ConfigService, BaseTabComponent, ElectronService, HostAppService, HotkeysService, Platform } from 'terminus-core'

import { IShell } from '../api'
import { Session, SessionsService } from '../services/sessions.service'
import { TerminalService } from '../services/terminal.service'

import { TerminalDecorator, ResizeEvent, SessionOptions } from '../api'
import { hterm, preferenceManager } from '../hterm'

@Component({
    selector: 'terminalTab',
    template: `
        <div
            #content
            class="content"
            [style.opacity]="htermVisible ? 1 : 0"
        ></div>
    `,
    styles: [require('./terminalTab.component.scss')],
})
export class TerminalTabComponent extends BaseTabComponent {
    session: Session
    @Input() sessionOptions: SessionOptions
    @Input() zoom = 0
    @ViewChild('content') content
    @HostBinding('style.background-color') backgroundColor: string
    hterm: any
    sessionCloseSubscription: Subscription
    hotkeysSubscription: Subscription
    bell$ = new Subject()
    size: ResizeEvent
    resize$: Observable<ResizeEvent>
    input$ = new Subject<string>()
    output$ = new Subject<string>()
    contentUpdated$: Observable<void>
    alternateScreenActive$ = new BehaviorSubject(false)
    mouseEvent$ = new Subject<Event>()
    htermVisible = false
    shell: IShell
    private resize_ = new Subject<ResizeEvent>()
    private contentUpdated_ = new Subject<void>()
    private bellPlayer: HTMLAudioElement
    private io: any
    private contextMenu: any

    constructor (
        private zone: NgZone,
        private app: AppService,
        private hostApp: HostAppService,
        private hotkeys: HotkeysService,
        private sessions: SessionsService,
        private electron: ElectronService,
        private terminalService: TerminalService,
        public config: ConfigService,
        private toastr: ToastrService,
        @Optional() @Inject(TerminalDecorator) private decorators: TerminalDecorator[],
    ) {
        super()
        this.resize$ = this.resize_.asObservable()
        this.decorators = this.decorators || []
        this.setTitle('Terminal')
        this.resize$.pipe(first()).subscribe(async resizeEvent => {
            if (!this.session) {
                this.session = this.sessions.addSession(
                    Object.assign({}, this.sessionOptions, resizeEvent)
                )
            }

            setTimeout(() => {
                this.session.resize(resizeEvent.width, resizeEvent.height)
            }, 1000)

            // this.session.output$.bufferTime(10).subscribe((datas) => {
            this.session.output$.subscribe(data => {
                this.zone.run(() => {
                    this.output$.next(data)
                    this.write(data)
                })
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
            switch (hotkey) {
            case 'ctrl-c':
                if (this.hterm.getSelectionText()) {
                    this.hterm.copySelectionToClipboard()
                    this.hterm.getDocument().getSelection().removeAllRanges()
                } else {
                    this.sendInput('\x03')
                }
                break
            case 'copy':
                this.hterm.copySelectionToClipboard()
                break
            case 'paste':
                this.paste()
                break
            case 'clear':
                this.clear()
                break
            case 'zoom-in':
                this.zoomIn()
                break
            case 'zoom-out':
                this.zoomOut()
                break
            case 'reset-zoom':
                this.resetZoom()
                break
            case 'home':
                this.sendInput('\x1bOH')
                break
            case 'end':
                this.sendInput('\x1bOF')
                break
            case 'previous-word':
                this.sendInput('\x1bb')
                break
            case 'next-word':
                this.sendInput('\x1bf')
                break
            case 'delete-previous-word':
                this.sendInput('\x1b\x7f')
                break
            case 'delete-next-word':
                this.sendInput('\x1bd')
                break
            }
        })
        this.bellPlayer = document.createElement('audio')
        this.bellPlayer.src = require<string>('../bell.ogg')
    }

    getRecoveryToken (): any {
        return {
            type: 'app:terminal',
            recoveryId: this.sessionOptions.recoveryId,
        }
    }

    ngOnInit () {
        this.focused$.subscribe(() => {
            this.configure()
            setTimeout(() => {
                this.hterm.scrollPort_.resize()
                this.hterm.scrollPort_.focus()
            }, 100)
        })

        this.hterm = new hterm.hterm.Terminal()
        this.config.enabledServices(this.decorators).forEach((decorator) => {
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
            if (this.config.store.terminal.bell === 'visual') {
                preferenceManager.set('background-color', 'rgba(128,128,128,.25)')
                setTimeout(() => {
                    this.configure()
                }, 125)
            }
            if (this.config.store.terminal.bell === 'audible') {
                this.bellPlayer.play()
            }
            // TODO audible
        })

        this.contextMenu = this.electron.remote.Menu.buildFromTemplate([
            {
                label: 'New terminal',
                click: () => {
                    this.zone.run(() => {
                        this.terminalService.openTab(this.shell)
                    })
                }
            },
            {
                label: 'Copy',
                click: () => {
                    this.zone.run(() => {
                        setTimeout(() => {
                            this.hterm.copySelectionToClipboard()
                        })
                    })
                }
            },
            {
                label: 'Paste',
                click: () => {
                    this.zone.run(() => {
                        this.paste()
                    })
                }
            },
        ])
    }

    attachHTermHandlers (hterm: any) {
        hterm.setWindowTitle = title => this.zone.run(() => this.setTitle(title))

        const _setAlternateMode = hterm.setAlternateMode.bind(hterm)
        hterm.setAlternateMode = (state) => {
            _setAlternateMode(state)
            this.alternateScreenActive$.next(state)
        }

        const _copySelectionToClipboard = hterm.copySelectionToClipboard.bind(hterm)
        hterm.copySelectionToClipboard = () => {
            _copySelectionToClipboard()
            this.toastr.info('Copied')
        }

        hterm.primaryScreen_.syncSelectionCaret = () => null
        hterm.alternateScreen_.syncSelectionCaret = () => null
        hterm.primaryScreen_.terminal = hterm
        hterm.alternateScreen_.terminal = hterm

        hterm.scrollPort_.onPaste_ = (event) => {
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
            if (event.type === 'mousedown') {
                if (event.which === 3) {
                    if (this.config.store.terminal.rightClick === 'menu') {
                        this.contextMenu.popup({
                            x: event.pageX + this.content.nativeElement.getBoundingClientRect().left,
                            y: event.pageY + this.content.nativeElement.getBoundingClientRect().top,
                            async: true,
                        })
                    } else if (this.config.store.terminal.rightClick === 'paste') {
                        this.paste()
                    }
                    event.preventDefault()
                    event.stopPropagation()
                    return
                }
            }
            if (event.type === 'mousewheel') {
                if (event.ctrlKey || event.metaKey) {
                    if (event.wheelDeltaY > 0) {
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
                this.contentUpdated_.next()
            }

            const _deleteChars = screen.deleteChars.bind(screen)
            screen.deleteChars = (count) => {
                let ret = _deleteChars(count)
                this.contentUpdated_.next()
                return ret
            }
        }

        const _measureCharacterSize = hterm.scrollPort_.measureCharacterSize.bind(hterm.scrollPort_)
        hterm.scrollPort_.measureCharacterSize = () => {
            let size = _measureCharacterSize()
            size.height += this.config.store.terminal.linePadding
            return size
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
                this.resize_.next(this.size)
            })
        }
    }

    sendInput (data: string) {
        this.session.write(data)
    }

    write (data: string) {
        this.io.writeUTF8(data)
    }

    paste () {
        let data = this.electron.clipboard.readText()
        data = this.hterm.keyboard.encode(data)
        if (this.hterm.options_.bracketedPaste) {
            data = '\x1b[200~' + data + '\x1b[201~'
        }
        data = data.replace(/\r\n/g, '\n')
        this.sendInput(data)
    }

    clear () {
        this.hterm.wipeContents()
        this.hterm.onVTKeystroke('\f')
    }

    configure (): void {
        let config = this.config.store
        preferenceManager.set('font-family', `"${config.terminal.font}", "monospace-fallback", monospace`)
        this.setFontSize()
        preferenceManager.set('enable-bold', true)
        // preferenceManager.set('audible-bell-sound', '')
        preferenceManager.set('desktop-notification-bell', config.terminal.bell === 'notification')
        preferenceManager.set('enable-clipboard-notice', false)
        preferenceManager.set('receive-encoding', 'raw')
        preferenceManager.set('send-encoding', 'raw')
        preferenceManager.set('ctrl-plus-minus-zero-zoom', false)
        preferenceManager.set('scrollbar-visible', this.hostApp.platform === Platform.macOS)
        preferenceManager.set('copy-on-select', config.terminal.copyOnSelect)
        preferenceManager.set('alt-is-meta', config.terminal.altIsMeta)
        preferenceManager.set('alt-sends-what', 'browser-key')
        preferenceManager.set('alt-gr-mode', 'ctrl-alt')
        preferenceManager.set('pass-alt-number', true)
        preferenceManager.set('cursor-blink', config.terminal.cursorBlink)
        preferenceManager.set('clear-selection-after-copy', true)

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
            preferenceManager.set('background-color', 'transparent')
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
        css += config.appearance.css
        this.hterm.setCSS(css)
        this.hterm.setBracketedPaste(config.terminal.bracketedPaste)
        this.hterm.defaultCursorShape = {
            block: hterm.hterm.Terminal.cursorShape.BLOCK,
            underline: hterm.hterm.Terminal.cursorShape.UNDERLINE,
            beam: hterm.hterm.Terminal.cursorShape.BEAM,
        }[config.terminal.cursor]
        this.hterm.applyCursorShape()
        this.hterm.setCursorBlink(config.terminal.cursorBlink)
        if (config.terminal.cursorBlink) {
            this.hterm.onCursorBlink_()
        }
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
        this.config.enabledServices(this.decorators).forEach(decorator => {
            decorator.detach(this)
        })
        this.hotkeysSubscription.unsubscribe()
        if (this.sessionCloseSubscription) {
            this.sessionCloseSubscription.unsubscribe()
        }
        this.resize_.complete()
        this.input$.complete()
        this.output$.complete()
        this.contentUpdated_.complete()
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

    async canClose (): Promise<boolean> {
        if (this.hostApp.platform === Platform.Windows) {
            return true
        }
        let children = await this.session.getChildProcesses()
        if (children.length === 0) {
            return true
        }
        return confirm(`"${children[0].command}" is still running. Close?`)
    }

    private setFontSize () {
        preferenceManager.set('font-size', this.config.store.terminal.fontSize * Math.pow(1.1, this.zoom))
    }
}
