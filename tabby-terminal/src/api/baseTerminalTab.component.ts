import { Observable, Subject, first, auditTime, debounce, interval } from 'rxjs'
import { Spinner } from 'cli-spinner'
import colors from 'ansi-colors'
import { NgZone, OnInit, OnDestroy, Injector, ViewChild, HostBinding, Input, ElementRef, InjectFlags, Component } from '@angular/core'
import { trigger, transition, style, animate, AnimationTriggerMetadata } from '@angular/animations'
import { AppService, ConfigService, BaseTabComponent, HostAppService, HotkeysService, NotificationsService, Platform, LogService, Logger, TabContextMenuItemProvider, SplitTabComponent, SubscriptionContainer, MenuItemOptions, PlatformService, HostWindowService, ResettableTimeout, TranslateService, ThemesService } from 'tabby-core'

import { BaseSession } from '../session'

import { Frontend } from '../frontends/frontend'
import { XTermFrontend, XTermWebGLFrontend } from '../frontends/xtermFrontend'
import { ResizeEvent, BaseTerminalProfile } from './interfaces'
import { TerminalDecorator } from './decorator'
import { SearchPanelComponent } from '../components/searchPanel.component'
import { MultifocusService } from '../services/multifocus.service'
import { getTerminalBackgroundColor } from '../helpers'


const INACTIVE_TAB_UNLOAD_DELAY = 1000 * 30

/**
 * A class to base your custom terminal tabs on
 */
@Component({ template: '' })
export class BaseTerminalTabComponent<P extends BaseTerminalProfile> extends BaseTabComponent implements OnInit, OnDestroy {
    static template: string = require<string>('../components/baseTerminalTab.component.pug')
    static styles: string[] = [require<string>('../components/baseTerminalTab.component.scss')]
    static animations: AnimationTriggerMetadata[] = [
        trigger('toolbarSlide', [
            transition(':enter', [
                style({
                    transform: 'translateY(-25%)',
                    opacity: '0',
                }),
                animate('100ms ease-out', style({
                    transform: 'translateY(0%)',
                    opacity: '1',
                })),
            ]),
            transition(':leave', [
                animate('100ms ease-out', style({
                    transform: 'translateY(-25%)',
                    opacity: '0',
                })),
            ]),
        ]),
        trigger('panelSlide', [
            transition(':enter', [
                style({
                    transform: 'translateY(25%)',
                    opacity: '0',
                }),
                animate('100ms ease-out', style({
                    transform: 'translateY(0%)',
                    opacity: '1',
                })),
            ]),
            transition(':leave', [
                animate('100ms ease-out', style({
                    transform: 'translateY(25%)',
                    opacity: '0',
                })),
            ]),
        ]),
    ]

    session: BaseSession|null = null
    savedState?: any
    savedStateIsLive = false

    @Input() zoom = 0

    @Input() showSearchPanel = false

    /** @hidden */
    @ViewChild('content') content

    /** @hidden */
    @HostBinding('style.background-color') backgroundColor: string|null = null

    /** @hidden */
    @HostBinding('class.toolbar-enabled') enableToolbar = false

    /** @hidden */
    @HostBinding('class.toolbar-pinned') pinToolbar = false

    /** @hidden */
    @HostBinding('class.toolbar-revealed') revealToolbar = false

    frontend?: Frontend

    /** @hidden */
    frontendIsReady = false

    frontendReady = new Subject<void>()
    size: ResizeEvent

    profile: P

    /**
     * Enables normal passthrough from session output to terminal input
     */
    enablePassthrough = true

    /**
     * Disables display of dynamic window/tab title provided by the shell
     */
    disableDynamicTitle = false

    alternateScreenActive = false

    @ViewChild(SearchPanelComponent, { 'static': false }) searchPanel?: SearchPanelComponent

    // Deps start
    config: ConfigService
    element: ElementRef
    protected zone: NgZone
    protected app: AppService
    protected hostApp: HostAppService
    protected hotkeys: HotkeysService
    protected platform: PlatformService
    protected notifications: NotificationsService
    protected log: LogService
    protected decorators: TerminalDecorator[] = []
    protected contextMenuProviders: TabContextMenuItemProvider[]
    protected hostWindow: HostWindowService
    protected translate: TranslateService
    protected multifocus: MultifocusService
    protected themes: ThemesService
    // Deps end

    protected logger: Logger
    protected output = new Subject<string>()
    protected binaryOutput = new Subject<Buffer>()
    protected sessionChanged = new Subject<BaseSession|null>()
    protected recentInputs = ''
    private bellPlayer: HTMLAudioElement
    private termContainerSubscriptions = new SubscriptionContainer()
    private sessionHandlers = new SubscriptionContainer()
    private spinner = new Spinner({
        stream: {
            write: x => {
                try {
                    if (!this.frontend) {
                        return
                    }
                    this.writeRaw(x)
                } catch {
                    this.spinner.stop()
                }
            },
        },
    })

    private spinnerActive = false
    private spinnerPaused = false
    private toolbarRevealTimeout = new ResettableTimeout(() => {
        this.revealToolbar = false
    }, 1000)

    private frontendWriteLock = Promise.resolve()

    get input$ (): Observable<Buffer> {
        if (!this.frontend) {
            throw new Error('Frontend not ready')
        }
        return this.frontend.input$
    }

    get output$ (): Observable<string> { return this.output }
    get binaryOutput$ (): Observable<Buffer> { return this.binaryOutput }

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
        super(injector)

        this.config = injector.get(ConfigService)
        this.element = injector.get(ElementRef)
        this.zone = injector.get(NgZone)
        this.app = injector.get(AppService)
        this.hostApp = injector.get(HostAppService)
        this.hotkeys = injector.get(HotkeysService)
        this.platform = injector.get(PlatformService)
        this.notifications = injector.get(NotificationsService)
        this.log = injector.get(LogService)
        this.decorators = injector.get<any>(TerminalDecorator, null, InjectFlags.Optional) as TerminalDecorator[]
        this.contextMenuProviders = injector.get<any>(TabContextMenuItemProvider, null, InjectFlags.Optional) as TabContextMenuItemProvider[]
        this.hostWindow = injector.get(HostWindowService)
        this.translate = injector.get(TranslateService)
        this.multifocus = injector.get(MultifocusService)
        this.themes = injector.get(ThemesService)

        this.logger = this.log.create('baseTerminalTab')
        this.setTitle(this.translate.instant('Terminal'))

        this.subscribeUntilDestroyed(this.hotkeys.unfilteredHotkey$, async hotkey => {
            if (!this.hasFocus) {
                return
            }
            if (hotkey === 'search') {
                this.showSearchPanel = true
                setImmediate(() => {
                    const input = this.element.nativeElement.querySelector('.search-input')
                    const selectedText = (this.frontend?.getSelection() ?? '').trim()
                    if (input && selectedText.length) {
                        input.value = selectedText
                    }

                    input?.focus()
                    input?.select()
                })
            }
        })

        this.subscribeUntilDestroyed(this.hotkeys.hotkey$, async hotkey => {
            if (!this.hasFocus) {
                return
            }
            switch (hotkey) {
                case 'ctrl-c':
                    if (this.frontend?.getSelection()) {
                        this.frontend.copySelection()
                        this.frontend.clearSelection()
                        this.notifications.notice(this.translate.instant('Copied'))
                    } else {
                        this.forEachFocusedTerminalPane(tab => tab.sendInput('\x03'))
                    }
                    break
                case 'copy':
                    this.frontend?.copySelection()
                    this.frontend?.clearSelection()
                    this.notifications.notice(this.translate.instant('Copied'))
                    break
                case 'paste':
                    this.forEachFocusedTerminalPane(tab => tab.paste())
                    break
                case 'select-all':
                    this.frontend?.selectAll()
                    break
                case 'clear':
                    this.forEachFocusedTerminalPane(tab => tab.frontend?.clear())
                    break
                case 'zoom-in':
                    this.forEachFocusedTerminalPane(tab => tab.zoomIn())
                    break
                case 'zoom-out':
                    this.forEachFocusedTerminalPane(tab => tab.zoomOut())
                    break
                case 'reset-zoom':
                    this.forEachFocusedTerminalPane(tab => tab.resetZoom())
                    break
                case 'previous-word':
                    this.forEachFocusedTerminalPane(tab => {
                        tab.sendInput({
                            [Platform.Windows]: '\x1b[1;5D',
                            [Platform.macOS]: '\x1bb',
                            [Platform.Linux]: '\x1bb',
                        }[this.hostApp.platform])
                    })
                    break
                case 'next-word':
                    this.forEachFocusedTerminalPane(tab => {
                        tab.sendInput({
                            [Platform.Windows]: '\x1b[1;5C',
                            [Platform.macOS]: '\x1bf',
                            [Platform.Linux]: '\x1bf',
                        }[this.hostApp.platform])
                    })
                    break
                case 'delete-line':
                    this.forEachFocusedTerminalPane(tab => {
                        tab.sendInput('\x1bw')
                    })
                    break
                case 'delete-previous-word':
                    this.forEachFocusedTerminalPane(tab => {
                        tab.sendInput('\u0017')
                    })
                    break
                case 'delete-next-word':
                    this.forEachFocusedTerminalPane(tab => {
                        tab.sendInput({
                            [Platform.Windows]: '\x1bd\x1b[3;5~',
                            [Platform.macOS]: '\x1bd',
                            [Platform.Linux]: '\x1bd',
                        }[this.hostApp.platform])
                    })
                    break
                case 'copy-current-path':
                    this.copyCurrentPath()
                    break
                case 'scroll-to-top':
                    this.frontend?.scrollToTop()
                    break
                case 'scroll-up':
                    this.frontend?.scrollPages(-1)
                    break
                case 'scroll-down':
                    this.frontend?.scrollPages(1)
                    break
                case 'scroll-to-bottom':
                    this.frontend?.scrollToBottom()
                    break
            }
        })

        this.bellPlayer = document.createElement('audio')
        this.bellPlayer.src = require<string>('../bell.ogg')
        this.bellPlayer.load()

        this.contextMenuProviders.sort((a, b) => a.weight - b.weight)
    }

    /** @hidden */
    ngOnInit (): void {
        this.pinToolbar = this.enableToolbar && (window.localStorage.pinTerminalToolbar ?? 'true') === 'true'

        this.focused$.subscribe(() => {
            this.configure()
            this.frontend?.focus()
        })

        this.subscribeUntilDestroyed(this.platform.themeChanged$, () => {
            this.configure()
        })

        // Check if the the WebGL renderer is compatible with xterm.js:
        // - https://github.com/Eugeny/tabby/issues/8884
        // - https://github.com/microsoft/vscode/issues/190195
        // - https://github.com/xtermjs/xterm.js/issues/4665
        // - https://bugs.chromium.org/p/chromium/issues/detail?id=1476475
        //
        // Inspired by https://github.com/microsoft/vscode/pull/191795

        let enable8884Workarround = false
        const checkCanvas = document.createElement('canvas')
        const checkGl = checkCanvas.getContext('webgl2')
        const debugInfo = checkGl?.getExtension('WEBGL_debug_renderer_info')
        if (checkGl && debugInfo) {
            const renderer = checkGl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            if (renderer.startsWith('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)')) {
                enable8884Workarround = true
            }
        }

        const cls: new (..._) => Frontend = enable8884Workarround ? XTermFrontend : {
            xterm: XTermFrontend,
            'xterm-webgl': XTermWebGLFrontend,
        }[this.config.store.terminal.frontend] ?? XTermFrontend
        this.frontend = new cls(this.injector)

        this.frontendReady$.pipe(first()).subscribe(() => {
            this.onFrontendReady()
        })

        this.frontend.resize$.pipe(first()).subscribe(async ({ columns, rows }) => {
            this.size = { columns, rows }
            this.frontendReady.next()
            this.frontendReady.complete()

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
            this.sessionChanged$.subscribe(() => {
                this.session?.releaseInitialDataBuffer()
            })
        })

        this.alternateScreenActive$.subscribe(x => {
            this.alternateScreenActive = x
        })

        setImmediate(async () => {
            if (this.hasFocus) {
                await this.frontend?.attach(this.content.nativeElement, this.profile)
                this.frontend?.configure(this.profile)
            } else {
                this.focused$.pipe(first()).subscribe(async () => {
                    await this.frontend?.attach(this.content.nativeElement, this.profile)
                    this.frontend?.configure(this.profile)
                })
            }
        })

        this.attachTermContainerHandlers()

        this.configure()

        setTimeout(() => {
            this.binaryOutput$.subscribe(() => {
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
            this.multifocus.cancel()
        })

        this.visibility$
            .pipe(debounce(visibility => interval(visibility ? 0 : INACTIVE_TAB_UNLOAD_DELAY)))
            .subscribe(visibility => {
                if (this.frontend instanceof XTermFrontend) {
                    if (visibility) {
                        // this.frontend.resizeHandler()
                        const term = this.frontend.xterm as any
                        term._core._renderService.clear()
                        term._core._renderService.handleResize(term.cols, term.rows)
                    } else {
                        this.frontend.xterm.element?.querySelectorAll('canvas').forEach(c => {
                            c.height = c.width = 0
                            c.style.height = c.style.width = '0px'
                        })
                    }
                }
            })
    }

    protected onFrontendReady (): void {
        this.frontendIsReady = true
        if (this.savedState) {
            this.frontend!.restoreState(this.savedState)
            if (!this.savedStateIsLive) {
                this.frontend!.write('\r\n\r\n')
                this.frontend!.write(colors.bgWhite.black(' * ') + colors.bgBlackBright.white(' History restored '))
                this.frontend!.write('\r\n\r\n')
            }
        }

        this.input$.subscribe(data => {
            this.recentInputs += data
            this.recentInputs = this.recentInputs.substring(this.recentInputs.length - 32)
        })
    }

    async buildContextMenu (): Promise<MenuItemOptions[]> {
        let items: MenuItemOptions[] = []
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
        this.session?.feedFromTerminal(data)
        if (this.config.store.terminal.scrollOnInput) {
            this.frontend?.scrollToBottom()
        }
    }

    /**
     * Feeds input into the terminal frontend
     */
    async write (data: string): Promise<void> {
        this.frontendWriteLock = this.frontendWriteLock.then(() =>
            this.withSpinnerPaused(() => this.writeRaw(data)))
        await this.frontendWriteLock
    }

    protected async writeRaw (data: string): Promise<void> {
        if (!this.frontend) {
            throw new Error('Frontend not ready')
        }

        if (this.config.store.terminal.detectProgress) {
            const percentageMatch = /(^|[^\d])(\d+(\.\d+)?)%([^\d]|$)/.exec(data)
            if (!this.alternateScreenActive && percentageMatch) {
                const percentage = percentageMatch[3] ? parseFloat(percentageMatch[2]) : parseInt(percentageMatch[2])
                if (percentage > 0 && percentage <= 100) {
                    this.setProgress(percentage)
                }
            } else {
                this.setProgress(null)
            }
        }

        await this.frontend.write(data)
    }

    async paste (): Promise<void> {
        let data = this.platform.readClipboard()
        if (this.hostApp.platform === Platform.Windows) {
            data = data.replaceAll('\r\n', '\r')
        } else {
            data = data.replaceAll('\n', '\r')
        }

        if (this.config.store.terminal.trimWhitespaceOnPaste && data.indexOf('\n') === data.length - 1) {
            // Ends with a newline and has no other line breaks
            data = data.substring(0, data.length - 1)
        }

        if (!this.alternateScreenActive) {
            if (data.includes('\r') && this.config.store.terminal.warnOnMultilinePaste) {
                const buttons = [
                    this.translate.instant('Paste'),
                    this.translate.instant('Cancel'),
                ]
                const result = (await this.platform.showMessageBox(
                    {
                        type: 'warning',
                        detail: data.slice(0, 1000),
                        message: this.translate.instant('Paste multiple lines?'),
                        buttons,
                        defaultId: 0,
                        cancelId: 1,
                    },
                )).response
                if (result === 1) {
                    return
                }
            } else {
                if (this.config.store.terminal.trimWhitespaceOnPaste) {
                    data = data.trimEnd()
                    if (!data.includes('\r')) {
                        data = data.trimStart()
                    }
                }
            }
        }

        if (this.config.store.terminal.bracketedPaste && this.frontend?.supportsBracketedPaste()) {
            data = `\x1b[200~${data}\x1b[201~`
        }
        this.sendInput(data)
    }

    /**
     * Applies the user settings to the terminal
     */
    configure (): void {
        this.frontend?.configure(this.profile)

        this.backgroundColor = getTerminalBackgroundColor(this.config, this.themes, this.profile.terminalColorScheme)
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

    async copyCurrentPath (): Promise<void> {
        let cwd: string|null = null
        if (this.session?.supportsWorkingDirectory()) {
            cwd = await this.session.getWorkingDirectory()
        }
        if (cwd) {
            this.platform.setClipboard({ text: cwd })
            this.notifications.notice(this.translate.instant('Copied'))
        } else {
            this.notifications.error(this.translate.instant('Shell does not support current path detection'))
        }
    }

    /** @hidden */
    ngOnDestroy (): void {
        super.ngOnDestroy()
        this.stopSpinner()
    }

    async destroy (): Promise<void> {
        this.frontend?.detach(this.content.nativeElement)
        this.frontend?.destroy()
        this.frontend = undefined
        this.content.nativeElement.remove()
        this.detachTermContainerHandlers()
        this.config.enabledServices(this.decorators).forEach(decorator => {
            try {
                decorator.detach(this)
            } catch (e) {
                this.logger.warn('Decorator attach() throws', e)
            }
        })
        this.output.complete()
        this.binaryOutput.complete()
        this.frontendReady.complete()

        super.destroy()
        if (this.session?.open) {
            await this.session.destroy()
        }
    }

    protected detachTermContainerHandlers (): void {
        this.termContainerSubscriptions.cancelAll()
    }

    private rightMouseDownTime = 0

    protected async handleRightMouseDown (event: MouseEvent): Promise<void> {
        event.preventDefault()
        event.stopPropagation()
        this.rightMouseDownTime = Date.now()
        if (this.config.store.terminal.rightClick === 'menu') {
            this.platform.popupContextMenu(await this.buildContextMenu(), event)
        }
    }

    protected async handleRightMouseUp (event: MouseEvent): Promise<void> {
        event.preventDefault()
        event.stopPropagation()
        if (this.config.store.terminal.rightClick === 'paste'
            || this.config.store.terminal.rightClick === 'clipboard') {
            const duration = Date.now() - this.rightMouseDownTime
            if (duration < 250) {
                if (this.config.store.terminal.rightClick === 'paste') {
                    this.paste()
                } else if (this.config.store.terminal.rightClick === 'clipboard') {
                    if (this.frontend?.getSelection()) {
                        this.frontend.copySelection()
                        this.frontend.clearSelection()
                    } else {
                        this.paste()
                    }
                }
            } else {
                this.platform.popupContextMenu(await this.buildContextMenu(), event)
            }
        }
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

        this.termContainerSubscriptions.subscribe(this.frontend.title$, title => this.zone.run(() => {
            if (!this.disableDynamicTitle) {
                this.setTitle(title)
            }
        }))

        this.termContainerSubscriptions.subscribe(this.focused$, () => this.frontend && (this.frontend.enableResizing = true))
        this.termContainerSubscriptions.subscribe(this.blurred$, () => this.frontend && (this.frontend.enableResizing = false))

        this.termContainerSubscriptions.subscribe(this.frontend.mouseEvent$, event => {
            if (event.type === 'mousedown') {
                if (event.which === 1) {
                    this.multifocus.cancel()
                }
                if (event.which === 2) {
                    if (this.config.store.terminal.pasteOnMiddleClick) {
                        this.paste()
                    }
                    event.preventDefault()
                    event.stopPropagation()
                    return
                }
                if (event.which === 3 || event.which === 1 && event.ctrlKey) {
                    this.handleRightMouseDown(event)
                    return
                }
            }
            if (event.type === 'mouseup') {
                if (event.which === 3 || event.which === 1 && event.ctrlKey) {
                    this.handleRightMouseUp(event)
                    return
                }
            }
            if (event.type === 'mousewheel') {
                let wheelDeltaY = 0

                if ('wheelDeltaY' in event) {
                    wheelDeltaY = (event as unknown as WheelEvent)['wheelDeltaY']
                } else {
                    wheelDeltaY = (event as unknown as WheelEvent).deltaY
                }

                if (event.altKey) {
                    event.preventDefault()
                    const delta = Math.round(wheelDeltaY / 50)
                    this.sendInput((delta > 0 ? '\u001bOA' : '\u001bOB').repeat(Math.abs(delta)))
                }
            }
        })

        this.termContainerSubscriptions.subscribe(this.frontend.input$, data => {
            this.sendInput(data)
        })

        this.termContainerSubscriptions.subscribe(this.frontend.resize$.pipe(auditTime(100)), ({ columns, rows }) => {
            this.logger.debug(`Resizing to ${columns}x${rows}`)
            this.size = { columns, rows }
            this.zone.run(() => {
                if (this.session?.open) {
                    this.session.resize(columns, rows)
                }
            })
        })

        this.termContainerSubscriptions.subscribe(this.platform.displayMetricsChanged$, maybeConfigure)
        this.termContainerSubscriptions.subscribe(this.hostWindow.windowMoved$, maybeConfigure)
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

    showToolbar (): void {
        this.revealToolbar = true
        this.toolbarRevealTimeout.clear()
    }

    hideToolbar (): void {
        this.toolbarRevealTimeout.set()
    }

    togglePinToolbar (): void {
        this.pinToolbar = !this.pinToolbar
        window.localStorage.pinTerminalToolbar = this.pinToolbar
    }

    @HostBinding('class.with-title-inset') get hasTitleInset (): boolean {
        return this.hostApp.platform === Platform.macOS && this.config.store.appearance.tabsLocation !== 'top' && this.config.store.appearance.frame === 'thin'
    }

    protected attachSessionHandler <T> (observable: Observable<T>, handler: (v: T) => void): void {
        this.sessionHandlers.subscribe(observable, handler)
    }

    protected attachSessionHandlers (destroyOnSessionClose = false): void {
        if (!this.session) {
            throw new Error('Session not set')
        }

        // this.session.output$.bufferTime(10).subscribe((datas) => {
        this.attachSessionHandler(this.session.output$, data => {
            if (this.enablePassthrough) {
                this.output.next(data)
                this.write(data)
            }
        })

        this.attachSessionHandler(this.session.binaryOutput$, data => {
            if (this.enablePassthrough) {
                this.binaryOutput.next(data)
            }
        })

        this.attachSessionHandler(this.session.closed$, () => {
            this.onSessionClosed(destroyOnSessionClose)
        })

        this.attachSessionHandler(this.session.destroyed$, () => {
            this.onSessionDestroyed()
        })

        this.attachSessionHandler(this.session.oscProcessor.copyRequested$, content => {
            this.platform.setClipboard({ text: content })
            this.notifications.notice(this.translate.instant('Copied'))
        })
    }

    /**
     * Method called when session is closed.
     */
    protected onSessionClosed (destroyOnSessionClose = false): void {
        if (destroyOnSessionClose || this.shouldTabBeDestroyedOnSessionClose()) {
            this.destroy()
        }
    }

    /**
     * Return true if tab should be destroyed on session closed.
     */
    protected shouldTabBeDestroyedOnSessionClose (): boolean {
        const behavior = this.profile.behaviorOnSessionEnd
        return behavior === 'close' || behavior === 'auto' && this.isSessionExplicitlyTerminated()
    }

    /**
     * Method called when session is destroyed. Set the session to null
     */
    protected onSessionDestroyed (): void {
        this.setSession(null)
    }

    protected detachSessionHandlers (): void {
        this.sessionHandlers.cancelAll()
    }

    protected startSpinner (text?: string): void {
        if (this.spinnerActive || this.spinnerPaused) {
            return
        }
        if (text) {
            this.spinner.text = text
        }
        this.spinner.setSpinnerString(6)
        this.spinnerActive = true
        this.zone.runOutsideAngular(() => {
            this.spinner.start()
        })
    }

    protected stopSpinner (): void {
        if (!this.spinnerActive) {
            return
        }
        this.spinner.stop(true)
        this.spinnerActive = false
    }

    protected async withSpinnerPaused (work: () => any): Promise<void> {
        this.spinnerPaused = true
        if (this.spinnerActive) {
            this.spinner.stop(true)
        }
        try {
            await work()
        } finally {
            this.spinnerPaused = false
            if (this.spinnerActive) {
                this.zone.runOutsideAngular(() => {
                    this.spinner.start()
                })
            }
        }
    }

    protected forEachFocusedTerminalPane (cb: (tab: BaseTerminalTabComponent<any>) => void): void {
        if (this.parent && this.parent instanceof SplitTabComponent && this.parent._allFocusMode) {
            for (const tab of this.parent.getAllTabs()) {
                if (tab instanceof BaseTerminalTabComponent) {
                    cb(tab)
                }
            }
        } else {
            cb(this)
        }
    }

    /**
     * Return true if the user explicitly exit the session
     */
    protected isSessionExplicitlyTerminated (): boolean {
        return false
    }
}
