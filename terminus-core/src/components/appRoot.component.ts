import { Component, Inject, Input, HostListener, HostBinding } from '@angular/core'
import { trigger, style, animate, transition, state } from '@angular/animations'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'

import { ElectronService } from '../services/electron.service'
import { HostAppService, Platform } from '../services/hostApp.service'
import { HotkeysService } from '../services/hotkeys.service'
import { Logger, LogService } from '../services/log.service'
import { ConfigService } from '../services/config.service'
import { DockingService } from '../services/docking.service'
import { TabRecoveryService } from '../services/tabRecovery.service'
import { ThemesService } from '../services/themes.service'
import { UpdaterService, Update } from '../services/updater.service'
import { TouchbarService } from '../services/touchbar.service'

import { BaseTabComponent } from './baseTab.component'
import { SafeModeModalComponent } from './safeModeModal.component'
import { AppService, IToolbarButton, ToolbarButtonProvider } from '../api'

@Component({
    selector: 'app-root',
    template: require('./appRoot.component.pug'),
    styles: [require('./appRoot.component.scss')],
    animations: [
        trigger('animateTab', [
            state('in', style({
                'flex-basis': '200px',
                'width': '200px',
            })),
            transition(':enter', [
                style({
                    'flex-basis': '1px',
                    'width': '1px',
                }),
                animate('250ms ease-in-out', style({
                    'flex-basis': '200px',
                    'width': '200px',
                }))
            ]),
            transition(':leave', [
                style({
                    'flex-basis': '200px',
                    'width': '200px',
                }),
                animate('250ms ease-in-out', style({
                    'flex-basis': '1px',
                    'width': '1px',
                }))
            ])
        ])
    ]
})
export class AppRootComponent {
    Platform = Platform
    @Input() ready = false
    @Input() leftToolbarButtons: IToolbarButton[]
    @Input() rightToolbarButtons: IToolbarButton[]
    @HostBinding('class.platform-win32') platformClassWindows = process.platform === 'win32'
    @HostBinding('class.platform-darwin') platformClassMacOS = process.platform === 'darwin'
    @HostBinding('class.platform-linux') platformClassLinux = process.platform === 'linux'
    @HostBinding('class.no-tabs') noTabs = true
    tabsDragging = false
    unsortedTabs: BaseTabComponent[] = []
    updateIcon: SafeHtml
    private logger: Logger
    private appUpdate: Update

    constructor (
        private docking: DockingService,
        private electron: ElectronService,
        private tabRecovery: TabRecoveryService,
        private hotkeys: HotkeysService,
        private updater: UpdaterService,
        private touchbar: TouchbarService,
        public hostApp: HostAppService,
        public config: ConfigService,
        public app: AppService,
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
        log: LogService,
        ngbModal: NgbModal,
        domSanitizer: DomSanitizer,
        _themes: ThemesService,
    ) {
        this.logger = log.create('main')
        this.logger.info('v', electron.app.getVersion())

        this.leftToolbarButtons = this.getToolbarButtons(false)
        this.rightToolbarButtons = this.getToolbarButtons(true)

        this.updateIcon = domSanitizer.bypassSecurityTrustHtml(require('../icons/gift.svg')),

        this.hotkeys.matchedHotkey.subscribe((hotkey) => {
            if (hotkey.startsWith('tab-')) {
                let index = parseInt(hotkey.split('-')[1])
                if (index <= this.app.tabs.length) {
                    this.app.selectTab(this.app.tabs[index - 1])
                }
            }
            if (this.app.activeTab) {
                if (hotkey === 'close-tab') {
                    this.app.closeTab(this.app.activeTab, true)
                }
                if (hotkey === 'toggle-last-tab') {
                    this.app.toggleLastTab()
                }
                if (hotkey === 'next-tab') {
                    this.app.nextTab()
                }
                if (hotkey === 'previous-tab') {
                    this.app.previousTab()
                }
            }
            if (hotkey === 'toggle-fullscreen') {
                this.hostApp.toggleFullscreen()
            }
        })

        this.docking.dock()
        this.hostApp.shown.subscribe(() => {
            this.docking.dock()
        })

        this.hostApp.secondInstance$.subscribe(() => {
            this.presentWindow()
        })
        this.hotkeys.globalHotkey.subscribe(() => {
            this.onGlobalHotkey()
        })

        if (window['safeModeReason']) {
            ngbModal.open(SafeModeModalComponent)
        }

        this.updater.check().then(update => {
            this.appUpdate = update
        })

        this.touchbar.update()

        config.changed$.subscribe(() => this.updateVibrancy())
        this.updateVibrancy()

        let lastProgress = null
        this.app.tabOpened$.subscribe(tab => {
            this.unsortedTabs.push(tab)
            tab.progress$.subscribe(progress => {
                if (lastProgress === progress) {
                    return
                }
                if (progress !== null) {
                    this.hostApp.getWindow().setProgressBar(progress / 100.0, { mode: 'normal' })
                } else {
                    this.hostApp.getWindow().setProgressBar(-1, { mode: 'none' })
                }
                lastProgress = progress
            })
            this.noTabs = false
        })

        this.app.tabClosed$.subscribe(tab => {
            this.unsortedTabs = this.unsortedTabs.filter(x => x !== tab)
            this.noTabs = app.tabs.length === 0
        })
    }

    onGlobalHotkey () {
        if (this.hostApp.getWindow().isFocused()) {
            this.hideWindow()
        } else {
            this.presentWindow()
        }
    }

    presentWindow () {
        if (!this.hostApp.getWindow().isVisible()) {
            // unfocused, invisible
            this.hostApp.getWindow().show()
            this.hostApp.getWindow().focus()
        } else {
            if (this.config.store.appearance.dock === 'off') {
                // not docked, visible
                setTimeout(() => {
                    this.hostApp.getWindow().focus()
                })
            } else {
                // docked, visible
                this.hostApp.getWindow().hide()
            }
        }
    }

    hideWindow () {
        this.electron.loseFocus()
        this.hostApp.getWindow().blur()
        if (this.hostApp.platform !== Platform.macOS) {
            this.hostApp.getWindow().hide()
        }
    }

    async ngOnInit () {
        await this.tabRecovery.recoverTabs()
        this.ready = true
        this.tabRecovery.saveTabs(this.app.tabs)

        this.app.emitReady()
    }

    @HostListener('dragover')
    onDragOver () {
        return false
    }

    @HostListener('drop')
    onDrop () {
        return false
    }

    updateApp () {
        this.electron.shell.openExternal(this.appUpdate.url)
    }

    onTabDragStart () {
        this.tabsDragging = true
    }

    onTabDragEnd () {
        setTimeout(() => {
            this.tabsDragging = false
            this.app.emitTabsChanged()
        })
    }

    private getToolbarButtons (aboveZero: boolean): IToolbarButton[] {
        let buttons: IToolbarButton[] = []
        this.config.enabledServices(this.toolbarButtonProviders).forEach(provider => {
            buttons = buttons.concat(provider.provide())
        })
        return buttons
            .filter((button) => (button.weight > 0) === aboveZero)
            .sort((a: IToolbarButton, b: IToolbarButton) => (a.weight || 0) - (b.weight || 0))
    }

    private updateVibrancy () {
        this.hostApp.setVibrancy(this.config.store.appearance.vibrancy, this.config.store.appearance.vibrancyType)
        this.hostApp.getWindow().setOpacity(this.config.store.appearance.opacity)
    }
}
