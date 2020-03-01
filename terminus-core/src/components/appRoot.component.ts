/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Inject, Input, HostListener, HostBinding } from '@angular/core'
import { trigger, style, animate, transition, state } from '@angular/animations'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'

import { ElectronService } from '../services/electron.service'
import { HostAppService, Platform } from '../services/hostApp.service'
import { HotkeysService } from '../services/hotkeys.service'
import { Logger, LogService } from '../services/log.service'
import { ConfigService } from '../services/config.service'
import { DockingService } from '../services/docking.service'
import { ThemesService } from '../services/themes.service'
import { UpdaterService } from '../services/updater.service'
import { TouchbarService } from '../services/touchbar.service'

import { BaseTabComponent } from './baseTab.component'
import { SafeModeModalComponent } from './safeModeModal.component'
import { AppService, ToolbarButton, ToolbarButtonProvider } from '../api'

/** @hidden */
@Component({
    selector: 'app-root',
    template: require('./appRoot.component.pug'),
    styles: [require('./appRoot.component.scss')],
    animations: [
        trigger('animateTab', [
            state('in', style({
                'flex-basis': '200px',
                width: '200px',
            })),
            transition(':enter', [
                style({
                    'flex-basis': '1px',
                    width: '1px',
                }),
                animate('250ms ease-in-out', style({
                    'flex-basis': '200px',
                    width: '200px',
                })),
            ]),
            transition(':leave', [
                style({
                    'flex-basis': '200px',
                    width: '200px',
                }),
                animate('250ms ease-in-out', style({
                    'flex-basis': '1px',
                    width: '1px',
                })),
            ]),
        ]),
    ],
})
export class AppRootComponent {
    Platform = Platform
    @Input() ready = false
    @Input() leftToolbarButtons: ToolbarButton[]
    @Input() rightToolbarButtons: ToolbarButton[]
    @HostBinding('class.platform-win32') platformClassWindows = process.platform === 'win32'
    @HostBinding('class.platform-darwin') platformClassMacOS = process.platform === 'darwin'
    @HostBinding('class.platform-linux') platformClassLinux = process.platform === 'linux'
    @HostBinding('class.no-tabs') noTabs = true
    tabsDragging = false
    unsortedTabs: BaseTabComponent[] = []
    updateIcon: string
    updatesAvailable = false
    private logger: Logger

    private constructor (
        private docking: DockingService,
        private electron: ElectronService,
        private hotkeys: HotkeysService,
        private updater: UpdaterService,
        private touchbar: TouchbarService,
        public hostApp: HostAppService,
        public config: ConfigService,
        public app: AppService,
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
        log: LogService,
        ngbModal: NgbModal,
        _themes: ThemesService,
    ) {
        this.logger = log.create('main')
        this.logger.info('v', electron.app.getVersion())

        this.leftToolbarButtons = this.getToolbarButtons(false)
        this.rightToolbarButtons = this.getToolbarButtons(true)

        this.updateIcon = require('../icons/gift.svg')

        this.hotkeys.matchedHotkey.subscribe((hotkey: string) => {
            if (hotkey.startsWith('tab-')) {
                const index = parseInt(hotkey.split('-')[1])
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
                if (hotkey === 'move-tab-left') {
                    this.app.moveSelectedTabLeft()
                }
                if (hotkey === 'move-tab-right') {
                    this.app.moveSelectedTabRight()
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

        this.hostApp.windowCloseRequest$.subscribe(async () => {
            if (await this.app.closeAllTabs()) {
                this.hostApp.closeWindow()
            }
        })

        if (window['safeModeReason']) {
            ngbModal.open(SafeModeModalComponent)
        }

        this.updater.check().then(available => {
            this.updatesAvailable = available
        })

        this.touchbar.update()

        config.changed$.subscribe(() => this.updateVibrancy())
        this.updateVibrancy()

        let lastProgress: number|null = null
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
                    this.hostApp.getWindow().show()
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
        this.ready = true

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

    async updateApp () {
        if ((await this.electron.showMessageBox(
            this.hostApp.getWindow(),
            {
                type: 'warning',
                message: 'Installing the update will close all tabs and restart Terminus.',
                buttons: ['Cancel', 'Update'],
                defaultId: 1,
            }
        )).response === 1) {
            this.updater.update()
        }
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

    async generateButtonSubmenu (button: ToolbarButton) {
        if (button.submenu) {
            button.submenuItems = await button.submenu()
        }
    }

    hasIcons (submenuItems: ToolbarButton[]): boolean {
        return submenuItems.some(x => !!x.icon)
    }

    private getToolbarButtons (aboveZero: boolean): ToolbarButton[] {
        let buttons: ToolbarButton[] = []
        this.config.enabledServices(this.toolbarButtonProviders).forEach(provider => {
            buttons = buttons.concat(provider.provide())
        })
        return buttons
            .filter(button => (button.weight || 0) > 0 === aboveZero)
            .sort((a: ToolbarButton, b: ToolbarButton) => (a.weight || 0) - (b.weight || 0))
    }

    private updateVibrancy () {
        this.hostApp.setVibrancy(this.config.store.appearance.vibrancy, this.config.store.appearance.vibrancyType)
        this.hostApp.getWindow().setOpacity(this.config.store.appearance.opacity)
    }
}
