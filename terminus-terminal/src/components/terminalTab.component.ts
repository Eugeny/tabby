import { Observable, Subject, Subscription } from 'rxjs'
import { first } from 'rxjs/operators'
import { ToastrService } from 'ngx-toastr'
import { Component, NgZone, Inject, Optional, ViewChild, HostBinding, Input } from '@angular/core'
import { AppService, ConfigService, BaseTabComponent, BaseTabProcess, ElectronService, HostAppService, HotkeysService, Platform } from 'terminus-core'

import { IShell } from '../api'
import { Session, SessionsService } from '../services/sessions.service'
import { TerminalService } from '../services/terminal.service'
import { TerminalFrontendService } from '../services/terminalFrontend.service'

import { TerminalDecorator, ResizeEvent, SessionOptions } from '../api'
import { Frontend } from '../frontends/frontend'

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
    frontend: Frontend
    sessionCloseSubscription: Subscription
    hotkeysSubscription: Subscription
    htermVisible = false
    shell: IShell
    private output = new Subject<string>()
    private bellPlayer: HTMLAudioElement
    private contextMenu: any
    private termContainerSubscriptions: Subscription[] = []

    get input$ (): Observable<string> { return this.frontend.input$ }
    get output$ (): Observable<string> { return this.output }
    get resize$ (): Observable<ResizeEvent> { return this.frontend.resize$ }
    get alternateScreenActive$ (): Observable<boolean> { return this.frontend.alternateScreenActive$ }

    constructor (
        private zone: NgZone,
        private app: AppService,
        private hostApp: HostAppService,
        private hotkeys: HotkeysService,
        private sessions: SessionsService,
        private electron: ElectronService,
        private terminalService: TerminalService,
        private terminalContainersService: TerminalFrontendService,
        public config: ConfigService,
        private toastr: ToastrService,
        @Optional() @Inject(TerminalDecorator) private decorators: TerminalDecorator[],
    ) {
        super()
        this.decorators = this.decorators || []
        this.setTitle('Terminal')

        this.session = new Session()

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

    initializeSession (columns: number, rows: number) {
        this.sessions.addSession(
            this.session,
            Object.assign({}, this.sessionOptions, {
                width: columns,
                height: rows,
            })
        )

        // this.session.output$.bufferTime(10).subscribe((datas) => {
        this.session.output$.subscribe(data => {
            this.zone.run(() => {
                this.output.next(data)
                this.write(data)
            })
        })

        this.sessionCloseSubscription = this.session.closed$.subscribe(() => {
            this.frontend.destroy()
            this.app.closeTab(this)
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
            this.configure()
            this.frontend.focus()
        })

        this.frontend = this.terminalContainersService.getFrontend(this.session)

        this.frontend.ready$.subscribe(() => {
            this.htermVisible = true
        })

        this.frontend.resize$.pipe(first()).subscribe(async ({columns, rows}) => {
            if (!this.session.open) {
                this.initializeSession(columns, rows)
            }

            setTimeout(() => {
                this.session.resize(columns, rows)
            }, 1000)

            this.session.releaseInitialDataBuffer()
        })

        this.frontend.configure(this.config.store)
        this.frontend.attach(this.content.nativeElement)
        this.attachTermContainerHandlers()

        this.configure()

        this.config.enabledServices(this.decorators).forEach((decorator) => {
            decorator.attach(this)
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

        this.contextMenu = [
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
                            this.frontend.copySelection()
                            this.toastr.info('Copied')
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
        ]
    }

    detachTermContainerHandlers () {
        for (let subscription of this.termContainerSubscriptions) {
            subscription.unsubscribe()
        }
        this.termContainerSubscriptions = []
    }

    attachTermContainerHandlers () {
        this.detachTermContainerHandlers()
        this.termContainerSubscriptions = [
            this.frontend.title$.subscribe(title => this.zone.run(() => this.setTitle(title))),

            this.focused$.subscribe(() => this.frontend.enableResizing = true),
            this.blurred$.subscribe(() => this.frontend.enableResizing = false),

            this.frontend.mouseEvent$.subscribe(event => {
                if (event.type === 'mousedown') {
                    if (event.which === 3) {
                        if (this.config.store.terminal.rightClick === 'menu') {
                            this.hostApp.popupContextMenu(this.contextMenu)
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
                        if ((event as MouseWheelEvent).wheelDeltaY > 0) {
                            this.zoomIn()
                        } else {
                            this.zoomOut()
                        }
                    } else if (event.altKey) {
                        event.preventDefault()
                        let delta = Math.round((event as MouseWheelEvent).wheelDeltaY / 50)
                        this.sendInput(((delta > 0) ? '\u001bOA' : '\u001bOB').repeat(Math.abs(delta)))
                    }
                }
            }),

            this.frontend.input$.subscribe(data => {
                this.sendInput(data)
            }),

            this.frontend.resize$.subscribe(({columns, rows}) => {
                console.log(`Resizing to ${columns}x${rows}`)
                this.zone.run(() => {
                    if (this.session.open) {
                        this.session.resize(columns, rows)
                    }
                })
            })
        ]
    }

    sendInput (data: string) {
        this.session.write(data)
        this.frontend.scrollToBottom()
    }

    write (data: string) {
        let percentageMatch = /(^|[^\d])(\d+(\.\d+)?)%([^\d]|$)/.exec(data)
        if (percentageMatch) {
            let percentage = percentageMatch[3] ? parseFloat(percentageMatch[2]) : parseInt(percentageMatch[2])
            if (percentage > 0 && percentage <= 100) {
                this.setProgress(percentage)
                console.log('Detected progress:', percentage)
            }
        } else {
            this.setProgress(null)
        }
        this.frontend.write(data)
    }

    paste () {
        let data = this.electron.clipboard.readText()
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

    configure (): void {
        this.frontend.configure(this.config.store)

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

    async getCurrentProcess (): Promise<BaseTabProcess> {
        let children = await this.session.getChildProcesses()
        if (!children.length) {
            return null
        }
        return {
            name: children[0].command
        }
    }

    ngOnDestroy () {
        this.frontend.detach(this.content.nativeElement)
        this.detachTermContainerHandlers()
        this.config.enabledServices(this.decorators).forEach(decorator => {
            decorator.detach(this)
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

    async canClose (): Promise<boolean> {
        let children = await this.session.getChildProcesses()
        if (children.length === 0) {
            return true
        }
        return confirm(`"${children[0].command}" is still running. Close?`)
    }
}
