import type { MenuItemConstructorOptions } from 'electron'
import { Observable, Subject, Subscription } from 'rxjs'
import { first } from 'rxjs/operators'
import colors from 'ansi-colors'
import { NgZone, OnInit, OnDestroy, Injector, ViewChild, HostBinding, Input, ElementRef, InjectFlags } from '@angular/core'
import { trigger, transition, style, animate, AnimationTriggerMetadata } from '@angular/animations'
import { AppService, ConfigService, BaseTabComponent, ElectronService, HostAppService, HotkeysService, NotificationsService, Platform, LogService, Logger, TabContextMenuItemProvider, SplitTabComponent } from 'terminus-core'

import { BaseSession, SessionsService } from '../services/sessions.service'
import { TerminalFrontendService } from '../services/terminalFrontend.service'

import { Frontend } from '../frontends/frontend'
import { ResizeEvent } from './interfaces'
import { TerminalDecorator } from './decorator'


/**
 * A class to base your custom terminal tabs on
 */
export class BaseTerminalTabComponent extends BaseTabComponent implements OnInit, OnDestroy {
    static template: string = require<string>('../components/baseTerminalTab.component.pug')
    static styles: string[] = [require<string>('../components/terminalTab.component.scss')]
    static animations: AnimationTriggerMetadata[] = [trigger('slideInOut', [
        transition(':enter', [
            style({ transform: 'translateY(-25%)' }),
            animate('100ms ease-in-out', style({ transform: 'translateY(0%)' })),
        ]),
        transition(':leave', [
            animate('100ms ease-in-out', style({ transform: 'translateY(-25%)' })),
        ]),
    ])]

    session: BaseSession|null = null
    savedState?: any

    @Input() zoom = 0

    @Input() showSearchPanel = false

    /** @hidden */
    @ViewChild('content') content

    /** @hidden */
    @HostBinding('style.background-color') backgroundColor: string|null = null

    /** @hidden */
    @HostBinding('class.top-padded') topPadded: boolean

    frontend?: Frontend

    /** @hidden */
    frontendIsReady = false

    frontendReady = new Subject<void>()
    size: ResizeEvent

    /**
     * Enables normall passthrough from session output to terminal input
     */
    enablePassthrough = true

    /**
     * Enables receiving dynamic window/tab title provided by the shell
     */
    enableDynamicTitle = true

    alternateScreenActive = false

    // Deps start
    config: ConfigService
    element: ElementRef
    protected zone: NgZone
    protected app: AppService
    protected hostApp: HostAppService
    protected hotkeys: HotkeysService
    protected sessions: SessionsService
    protected electron: ElectronService
    protected terminalContainersService: TerminalFrontendService
    protected notifications: NotificationsService
    protected log: LogService
    protected decorators: TerminalDecorator[] = []
    protected contextMenuProviders: TabContextMenuItemProvider[]
    // Deps end

    protected logger: Logger
    protected output = new Subject<string>()
    protected sessionChanged = new Subject<BaseSession|null>()
    private sessionCloseSubscription: Subscription
    private hotkeysSubscription: Subscription
    private bellPlayer: HTMLAudioElement
    private termContainerSubscriptions: Subscription[] = []
    private allFocusModeSubscription: Subscription|null = null
    private sessionHandlers: Subscription[] = []

    get input$ (): Observable<Buffer> {
        if (!this.frontend) {
            throw new Error('Frontend not ready')
        }
        return this.frontend.input$
    }

    get output$ (): Observable<string> { return this.output }

    get resize$ (): Observable<ResizeEvent> {
        if (!this.frontend) {
            throw new Error('Frontend not ready')
        }
        return this.frontend.resize$
    }

    get alternateScreenActive$ (): Observable<boolean> {
        if (!this.frontend) {
            throw new Error('Frontend not ready')
        }
        return this.frontend.alternateScreenActive$
    }

    get frontendReady$ (): Observable<void> { return this.frontendReady }

    get sessionChanged$ (): Observable<BaseSession|null> { return this.sessionChanged }

    constructor (protected injector: Injector) {
        super()

        this.config = injector.get(ConfigService)
        this.element = injector.get(ElementRef)
        this.zone = injector.get(NgZone)
        this.app = injector.get(AppService)
        this.hostApp = injector.get(HostAppService)
        this.hotkeys = injector.get(HotkeysService)
        this.sessions = injector.get(SessionsService)
        this.electron = injector.get(ElectronService)
        this.terminalContainersService = injector.get(TerminalFrontendService)
        this.notifications = injector.get(NotificationsService)
        this.log = injector.get(LogService)
        this.decorators = injector.get<any>(TerminalDecorator, null, InjectFlags.Optional) as TerminalDecorator[]
        this.contextMenuProviders = injector.get<any>(TabContextMenuItemProvider, null, InjectFlags.Optional) as TabContextMenuItemProvider[]

        this.logger = this.log.create('baseTerminalTab')
        this.setTitle('Terminal')

        this.hotkeysSubscription = this.hotkeys.matchedHotkey.subscribe(async hotkey => {
            if (!this.hasFocus) {
                return
            }
            switch (hotkey) {
                case 'ctrl-c':
                    if (this.frontend?.getSelection()) {
                        this.frontend.copySelection()
                        this.frontend.clearSelection()
                        this.notifications.notice('Copied')
                    } else {
                        this.sendInput('\x03')
                    }
                    break
                case 'copy':
                    this.frontend?.copySelection()
                    this.frontend?.clearSelection()
                    this.notifications.notice('Copied')
                    break
                case 'paste':
                    this.paste()
                    break
                case 'clear':
                    this.frontend?.clear()
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
                    this.sendInput({
                        [Platform.Windows]: '\x1b[1;5D',
                        [Platform.macOS]: '\x1bb',
                        [Platform.Linux]: '\x1bb',
                    }[this.hostApp.platform])
                    break
                case 'next-word':
                    this.sendInput({
                        [Platform.Windows]: '\x1b[1;5C',
                        [Platform.macOS]: '\x1bf',
                        [Platform.Linux]: '\x1bf',
                    }[this.hostApp.platform])
                    break
                case 'delete-previous-word':
                    this.sendInput('\x1b\x7f')
                    break
                case 'delete-next-word':
                    this.sendInput({
                        [Platform.Windows]: '\x1bd\x1b[3;5~',
                        [Platform.macOS]: '\x1bd',
                        [Platform.Linux]: '\x1bd',
                    }[this.hostApp.platform])
                    break
                case 'search':
                    this.showSearchPanel = true
                    setImmediate(() => {
                        this.element.nativeElement.querySelector('.search-input').focus()
                    })
                    break
                case 'pane-focus-all':
                    this.focusAllPanes()
                    break
                case 'copy-current-path':
                    this.copyCurrentPath()
                    break
            }
        })
        this.bellPlayer = document.createElement('audio')
        this.bellPlayer.src = require<string>('../bell.ogg')

        this.contextMenuProviders.sort((a, b) => a.weight - b.weight)
    }

    /** @hidden */
    ngOnInit (): void {
        this.focused$.subscribe(() => {
            this.configure()
            this.frontend?.focus()
        })

        this.frontend = this.terminalContainersService.getFrontend(this.session)

        this.frontend.ready$.subscribe(() => {
            this.frontendIsReady = true
        })

        this.frontend.resize$.pipe(first()).subscribe(async ({ columns, rows }) => {
            this.size = { columns, rows }
            this.frontendReady.next()

            this.config.enabledServices(this.decorators).forEach(decorator => {
                try {
                    decorator.attach(this)
                } catch (e) {
                    this.logger.warn('Decorator attach() throws', e)
                }
            })

            setTimeout(() => {
                this.session?.resize(columns, rows)
            }, 1000)

            this.session?.releaseInitialDataBuffer()
        })

        this.alternateScreenActive$.subscribe(x => {
            this.alternateScreenActive = x
        })

        if (this.savedState) {
            this.frontend.restoreState(this.savedState)
            this.frontend.write('\r\n\r\n')
            this.frontend.write(colors.bgWhite.black(' * ') + colors.bgBlackBright.white(' History restored '))
            this.frontend.write('\r\n\r\n')
        }

        setImmediate(() => {
            if (this.hasFocus) {
                this.frontend!.attach(this.content.nativeElement)
                this.frontend!.configure()
            } else {
                this.focused$.pipe(first()).subscribe(() => {
                    this.frontend!.attach(this.content.nativeElement)
                    this.frontend!.configure()
                })
            }
        })

        this.attachTermContainerHandlers()

        this.configure()

        setTimeout(() => {
            this.output.subscribe(() => {
                this.displayActivity()
            })
        }, 1000)

        this.frontend.bell$.subscribe(() => {
            if (this.config.store.terminal.bell === 'visual') {
                this.frontend?.visualBell()
            }
            if (this.config.store.terminal.bell === 'audible') {
                this.bellPlayer.play()
            }
        })

        this.frontend.focus()

        this.blurred$.subscribe(() => {
            this.cancelFocusAllPanes()
        })
    }

    async buildContextMenu (): Promise<MenuItemConstructorOptions[]> {
        let items: MenuItemConstructorOptions[] = []
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
    sendInput (data: string|Buffer): void {
        if (!(data instanceof Buffer)) {
            data = Buffer.from(data, 'utf-8')
        }
        this.session?.write(data)
        if (this.config.store.terminal.scrollOnInput) {
            this.frontend?.scrollToBottom()
        }
    }

    /**
     * Feeds input into the terminal frontend
     */
    write (data: string): void {
        if (!this.frontend) {
            throw new Error('Frontend not ready')
        }

        const percentageMatch = /(^|[^\d])(\d+(\.\d+)?)%([^\d]|$)/.exec(data)
        if (!this.alternateScreenActive && percentageMatch) {
            const percentage = percentageMatch[3] ? parseFloat(percentageMatch[2]) : parseInt(percentageMatch[2])
            if (percentage > 0 && percentage <= 100) {
                this.setProgress(percentage)
                // this.logger.debug('Detected progress:', percentage)
            }
        } else {
            this.setProgress(null)
        }
        this.frontend.write(data)
    }

    async paste (): Promise<void> {
        let data = this.electron.clipboard.readText()
        if (this.config.store.terminal.bracketedPaste) {
            data = `\x1b[200~${data}\x1b[201~`
        }
        if (this.hostApp.platform === Platform.Windows) {
            data = data.replace(/\r\n/g, '\r')
        } else {
            data = data.replace(/\n/g, '\r')
        }

        if (!this.alternateScreenActive) {
            data = data.trim()

            if (data.includes('\r') && this.config.store.terminal.warnOnMultilinePaste) {
                const buttons = ['Paste', 'Cancel']
                const result = (await this.electron.showMessageBox(
                    this.hostApp.getWindow(),
                    {
                        type: 'warning',
                        detail: data,
                        message: `Paste multiple lines?`,
                        buttons,
                        defaultId: 0,
                        cancelId: 1,
                    }
                )).response
                if (result === 1) {
                    return
                }
            }
        }
        this.sendInput(data)
    }

    /**
     * Applies the user settings to the terminal
     */
    configure (): void {
        this.frontend?.configure()

        this.topPadded = this.hostApp.platform === Platform.macOS
            && this.config.store.appearance.frame === 'thin'
            && this.config.store.appearance.tabsLocation !== 'top'

        if (this.config.store.terminal.background === 'colorScheme') {
            if (this.config.store.terminal.colorScheme.background) {
                this.backgroundColor = this.config.store.terminal.colorScheme.background
            }
        } else {
            this.backgroundColor = null
        }
    }

    zoomIn (): void {
        this.zoom++
        this.frontend?.setZoom(this.zoom)
    }

    zoomOut (): void {
        this.zoom--
        this.frontend?.setZoom(this.zoom)
    }

    resetZoom (): void {
        this.zoom = 0
        this.frontend?.setZoom(this.zoom)
    }

    focusAllPanes (): void {
        if (this.allFocusModeSubscription) {
            return
        }
        if (this.parent instanceof SplitTabComponent) {
            const parent = this.parent
            parent._allFocusMode = true
            parent.layout()
            this.allFocusModeSubscription = this.frontend?.input$.subscribe(data => {
                for (const tab of parent.getAllTabs()) {
                    if (tab !== this && tab instanceof BaseTerminalTabComponent) {
                        tab.sendInput(data)
                    }
                }
            }) ?? null
        }
    }

    cancelFocusAllPanes (): void {
        if (!this.allFocusModeSubscription) {
            return
        }
        if (this.parent instanceof SplitTabComponent) {
            this.allFocusModeSubscription?.unsubscribe?.()
            this.allFocusModeSubscription = null
            this.parent._allFocusMode = false
            this.parent.layout()
        }
    }

    async copyCurrentPath (): Promise<void> {
        let cwd: string|null = null
        if (this.session?.supportsWorkingDirectory()) {
            cwd = await this.session.getWorkingDirectory()
        }
        if (cwd) {
            this.electron.clipboard.writeText(cwd)
            this.notifications.notice('Copied')
        } else {
            this.notifications.error('Shell does not support current path detection')
        }
    }

    /** @hidden */
    ngOnDestroy (): void {
        this.frontend?.detach(this.content.nativeElement)
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

    async destroy (): Promise<void> {
        super.destroy()
        if (this.session?.open) {
            await this.session.destroy()
        }
    }

    protected detachTermContainerHandlers (): void {
        for (const subscription of this.termContainerSubscriptions) {
            subscription.unsubscribe()
        }
        this.termContainerSubscriptions = []
    }

    protected attachTermContainerHandlers (): void {
        this.detachTermContainerHandlers()

        if (!this.frontend) {
            throw new Error('Frontend not ready')
        }

        const maybeConfigure = () => {
            if (this.hasFocus) {
                setTimeout(() => this.configure(), 250)
            }
        }

        this.termContainerSubscriptions = [
            this.frontend.title$.subscribe(title => this.zone.run(() => {
                if (this.enableDynamicTitle) {
                    this.setTitle(title)
                }
            })),

            this.focused$.subscribe(() => this.frontend && (this.frontend.enableResizing = true)),
            this.blurred$.subscribe(() => this.frontend && (this.frontend.enableResizing = false)),

            this.frontend.mouseEvent$.subscribe(async event => {
                if (event.type === 'mousedown') {
                    if (event.which === 2) {
                        if (this.config.store.terminal.pasteOnMiddleClick) {
                            this.paste()
                        }
                        event.preventDefault()
                        event.stopPropagation()
                        return
                    }
                    if (event.which === 3 || event.which === 1 && event.ctrlKey) {
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
                    if (this.session?.open) {
                        this.session.resize(columns, rows)
                    }
                })
            }),

            this.hostApp.displayMetricsChanged$.subscribe(maybeConfigure),
            this.hostApp.windowMoved$.subscribe(maybeConfigure),
        ]
    }

    setSession (session: BaseSession|null, destroyOnSessionClose = false): void {
        if (session) {
            if (this.session) {
                this.setSession(null)
            }
            this.detachSessionHandlers()
            this.session = session
            this.attachSessionHandlers(destroyOnSessionClose)
        } else {
            this.detachSessionHandlers()
            this.session = null
        }
        this.sessionChanged.next(session)
    }

    protected attachSessionHandler (subscription: Subscription): void {
        this.sessionHandlers.push(subscription)
    }

    protected attachSessionHandlers (destroyOnSessionClose = false): void {
        if (!this.session) {
            throw new Error('Session not set')
        }

        // this.session.output$.bufferTime(10).subscribe((datas) => {
        this.attachSessionHandler(this.session.output$.subscribe(data => {
            if (this.enablePassthrough) {
                this.zone.run(() => {
                    this.output.next(data)
                    this.write(data)
                })
            }
        }))

        if (destroyOnSessionClose) {
            this.attachSessionHandler(this.sessionCloseSubscription = this.session.closed$.subscribe(() => {
                this.frontend?.destroy()
                this.destroy()
            }))
        }

        this.attachSessionHandler(this.session.destroyed$.subscribe(() => {
            this.setSession(null)
        }))
    }

    protected detachSessionHandlers (): void {
        for (const s of this.sessionHandlers) {
            s.unsubscribe()
        }
        this.sessionHandlers = []
    }
}
