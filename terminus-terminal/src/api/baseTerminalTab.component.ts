import { Observable, Subject, Subscription } from 'rxjs'
import { first } from 'rxjs/operators'
import { ToastrService } from 'ngx-toastr'
import { NgZone, OnInit, OnDestroy, Inject, Injector, Optional, ViewChild, HostBinding, Input, ElementRef } from '@angular/core'
import { trigger, transition, style, animate, AnimationTriggerMetadata } from '@angular/animations'
import { AppService, ConfigService, BaseTabComponent, ElectronService, HostAppService, HotkeysService, Platform, LogService, Logger } from 'terminus-core'

import { BaseSession, SessionsService } from '../services/sessions.service'
import { TerminalFrontendService } from '../services/terminalFrontend.service'

import { Frontend } from '../frontends/frontend'
import { ResizeEvent } from './interfaces'
import { TerminalDecorator } from './decorator'
import { TerminalContextMenuItemProvider } from './contextMenuProvider'


/** @hidden */
export interface ToastrServiceProxy {
    info (_: string)
}
/**
 * A class to base your custom terminal tabs on
 */
export class BaseTerminalTabComponent extends BaseTabComponent implements OnInit, OnDestroy {
    static template = require('../components/baseTerminalTab.component.pug')
    static styles = [require('../components/terminalTab.component.scss')]
    static animations: AnimationTriggerMetadata[] = [trigger('slideInOut', [
        transition(':enter', [
            style({ transform: 'translateY(-25%)' }),
            animate('100ms ease-in-out', style({ transform: 'translateY(0%)' })),
        ]),
        transition(':leave', [
            animate('100ms ease-in-out', style({ transform: 'translateY(-25%)' })),
        ]),
    ])]

    session: BaseSession
    @Input() zoom = 0

    @Input() showSearchPanel = false

    /** @hidden */
    @ViewChild('content') content

    /** @hidden */
    @HostBinding('style.background-color') backgroundColor: string

    /** @hidden */
    @HostBinding('class.top-padded') topPadded: boolean

    frontend: Frontend

    /** @hidden */
    frontendIsReady = false

    frontendReady = new Subject<void>()
    size: ResizeEvent

    protected logger: Logger
    protected output = new Subject<string>()
    private sessionCloseSubscription: Subscription
    private hotkeysSubscription: Subscription
    private bellPlayer: HTMLAudioElement
    private termContainerSubscriptions: Subscription[] = []

    get input$ (): Observable<string> { return this.frontend.input$ }
    get output$ (): Observable<string> { return this.output }
    get resize$ (): Observable<ResizeEvent> { return this.frontend.resize$ }
    get alternateScreenActive$ (): Observable<boolean> { return this.frontend.alternateScreenActive$ }
    get frontendReady$ (): Observable<void> { return this.frontendReady }

    constructor (
        public config: ConfigService,
        public element: ElementRef,
        protected injector: Injector,
        protected zone: NgZone,
        protected app: AppService,
        protected hostApp: HostAppService,
        protected hotkeys: HotkeysService,
        protected sessions: SessionsService,
        protected electron: ElectronService,
        protected terminalContainersService: TerminalFrontendService,
        @Inject(ToastrService) protected toastr: ToastrServiceProxy,
        protected log: LogService,
        @Optional() @Inject(TerminalDecorator) protected decorators: TerminalDecorator[],
        @Optional() @Inject(TerminalContextMenuItemProvider) protected contextMenuProviders: TerminalContextMenuItemProvider[],
    ) {
        super()
        this.logger = log.create('baseTerminalTab')
        this.decorators = this.decorators || []
        this.setTitle('Terminal')

        this.hotkeysSubscription = this.hotkeys.matchedHotkey.subscribe(hotkey => {
            if (!this.hasFocus) {
                return
            }
            switch (hotkey) {
                case 'ctrl-c':
                    if (this.frontend.getSelection()) {
                        this.frontend.copySelection()
                        this.frontend.clearSelection()
                        this.toastr.info('Copied')
                    } else {
                        this.sendInput('\x03')
                    }
                    break
                case 'copy':
                    this.frontend.copySelection()
                    this.frontend.clearSelection()
                    this.toastr.info('Copied')
                    break
                case 'paste':
                    this.paste()
                    break
                case 'clear':
                    this.frontend.clear()
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
                case 'search':
                    this.showSearchPanel = true
                    setImmediate(() => {
                        this.element.nativeElement.querySelector('.search-input').focus()
                    })
                    break
            }
        })
        this.bellPlayer = document.createElement('audio')
        this.bellPlayer.src = require<string>('../bell.ogg')

        this.contextMenuProviders.sort((a, b) => a.weight - b.weight)
    }

    /** @hidden */
    ngOnInit () {
        this.focused$.subscribe(() => {
            this.configure()
            this.frontend.focus()
        })

        this.frontend = this.terminalContainersService.getFrontend(this.session)

        this.frontend.ready$.subscribe(() => {
            this.frontendIsReady = true
        })

        this.frontend.resize$.pipe(first()).subscribe(async ({ columns, rows }) => {
            this.size = { columns, rows }
            this.frontendReady.next()

            setTimeout(() => {
                this.session.resize(columns, rows)
            }, 1000)

            this.session.releaseInitialDataBuffer()
        })

        setImmediate(() => {
            if (this.hasFocus) {
                this.frontend.attach(this.content.nativeElement)
                this.frontend.configure()
            } else {
                this.focused$.pipe(first()).subscribe(() => {
                    this.frontend.attach(this.content.nativeElement)
                    this.frontend.configure()
                })
            }
        })

        this.attachTermContainerHandlers()

        this.configure()

        this.config.enabledServices(this.decorators).forEach((decorator) => {
            try {
                decorator.attach(this)
            } catch (e) {
                this.logger.warn('Decorator attach() throws', e)
            }
        })

        setTimeout(() => {
            this.output.subscribe(() => {
                this.displayActivity()
            })
        }, 1000)

        this.frontend.bell$.subscribe(() => {
            if (this.config.store.terminal.bell === 'visual') {
                this.frontend.visualBell()
            }
            if (this.config.store.terminal.bell === 'audible') {
                this.bellPlayer.play()
            }
        })

        this.frontend.focus()
    }

    async buildContextMenu (): Promise<Electron.MenuItemConstructorOptions[]> {
        let items: Electron.MenuItemConstructorOptions[] = []
        for (const section of await Promise.all(this.contextMenuProviders.map(x => x.getItems(this)))) {
            items = items.concat(section)
            items.push({ type: 'separator' })
        }
        items.splice(items.length - 1, 1)
        return items
    }

    /**
     * Feeds input into the active session
     */
    sendInput (data: string) {
        this.session.write(data)
        if (this.config.store.terminal.scrollOnInput) {
            this.frontend.scrollToBottom()
        }
    }

    /**
     * Feeds input into the terminal frontend
     */
    write (data: string) {
        const percentageMatch = /(^|[^\d])(\d+(\.\d+)?)%([^\d]|$)/.exec(data)
        if (percentageMatch) {
            const percentage = percentageMatch[3] ? parseFloat(percentageMatch[2]) : parseInt(percentageMatch[2])
            if (percentage > 0 && percentage <= 100) {
                this.setProgress(percentage)
                this.logger.debug('Detected progress:', percentage)
            }
        } else {
            this.setProgress(null)
        }
        this.frontend.write(data)
    }

    paste () {
        let data = this.electron.clipboard.readText() as string
        if (this.config.store.terminal.bracketedPaste) {
            data = '\x1b[200~' + data + '\x1b[201~'
        }
        if (this.hostApp.platform === Platform.Windows) {
            data = data.replace(/\r\n/g, '\r')
        } else {
            data = data.replace(/\n/g, '\r')
        }
        this.sendInput(data)
    }

    /**
     * Applies the user settings to the terminal
     */
    configure (): void {
        this.frontend.configure()

        this.topPadded = this.hostApp.platform === Platform.macOS
            && this.config.store.appearance.frame === 'thin'
            && this.config.store.appearance.tabsLocation === 'bottom'

        if (this.config.store.terminal.background === 'colorScheme') {
            if (this.config.store.terminal.colorScheme.background) {
                this.backgroundColor = this.config.store.terminal.colorScheme.background
            }
        } else {
            this.backgroundColor = null
        }
    }

    zoomIn () {
        this.zoom++
        this.frontend.setZoom(this.zoom)
    }

    zoomOut () {
        this.zoom--
        this.frontend.setZoom(this.zoom)
    }

    resetZoom () {
        this.zoom = 0
        this.frontend.setZoom(this.zoom)
    }

    /** @hidden */
    ngOnDestroy () {
        this.frontend.detach(this.content.nativeElement)
        this.detachTermContainerHandlers()
        this.config.enabledServices(this.decorators).forEach(decorator => {
            try {
                decorator.detach(this)
            } catch (e) {
                this.logger.warn('Decorator attach() throws', e)
            }
        })
        this.hotkeysSubscription.unsubscribe()
        if (this.sessionCloseSubscription) {
            this.sessionCloseSubscription.unsubscribe()
        }
        this.output.complete()
    }

    async destroy () {
        super.destroy()
        if (this.session && this.session.open) {
            await this.session.destroy()
        }
    }

    protected detachTermContainerHandlers () {
        for (const subscription of this.termContainerSubscriptions) {
            subscription.unsubscribe()
        }
        this.termContainerSubscriptions = []
    }

    protected attachTermContainerHandlers () {
        this.detachTermContainerHandlers()

        const maybeConfigure = () => {
            if (this.hasFocus) {
                setTimeout(() => this.configure(), 250)
            }
        }

        this.termContainerSubscriptions = [
            this.frontend.title$.subscribe(title => this.zone.run(() => this.setTitle(title))),

            this.focused$.subscribe(() => this.frontend.enableResizing = true),
            this.blurred$.subscribe(() => this.frontend.enableResizing = false),

            this.frontend.mouseEvent$.subscribe(async event => {
                if (event.type === 'mousedown') {
                    if (event.which === 2) {
                        this.paste()
                        event.preventDefault()
                        event.stopPropagation()
                        return
                    }
                    if (event.which === 3) {
                        if (this.config.store.terminal.rightClick === 'menu') {
                            this.hostApp.popupContextMenu(await this.buildContextMenu())
                        } else if (this.config.store.terminal.rightClick === 'paste') {
                            this.paste()
                        }
                        event.preventDefault()
                        event.stopPropagation()
                        return
                    }
                }
                if (event.type === 'mousewheel') {
                    let wheelDeltaY = 0

                    if ('wheelDeltaY' in event) {
                        wheelDeltaY = (event as MouseWheelEvent)['wheelDeltaY']
                    } else {
                        wheelDeltaY = (event as MouseWheelEvent)['deltaY']
                    }

                    if (event.altKey) {
                        event.preventDefault()
                        const delta = Math.round(wheelDeltaY / 50)
                        this.sendInput((delta > 0 ? '\u001bOA' : '\u001bOB').repeat(Math.abs(delta)))
                    }
                }
            }),

            this.frontend.input$.subscribe(data => {
                this.sendInput(data)
            }),

            this.frontend.resize$.subscribe(({ columns, rows }) => {
                this.logger.debug(`Resizing to ${columns}x${rows}`)
                this.size = { columns, rows }
                this.zone.run(() => {
                    if (this.session && this.session.open) {
                        this.session.resize(columns, rows)
                    }
                })
            }),

            this.hostApp.displayMetricsChanged$.subscribe(maybeConfigure),
            this.hostApp.windowMoved$.subscribe(maybeConfigure),
        ]
    }

    protected attachSessionHandlers () {
        // this.session.output$.bufferTime(10).subscribe((datas) => {
        this.session.output$.subscribe(data => {
            this.zone.run(() => {
                this.output.next(data)
                this.write(data)
            })
        })

        this.sessionCloseSubscription = this.session.closed$.subscribe(() => {
            this.frontend.destroy()
            this.destroy()
        })
    }
}
