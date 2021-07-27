/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Inject, Input, HostListener, HostBinding, ViewChildren } from '@angular/core'
import { trigger, style, animate, transition, state } from '@angular/animations'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop'

import { HostAppService, Platform } from '../api/hostApp'
import { HotkeysService } from '../services/hotkeys.service'
import { Logger, LogService } from '../services/log.service'
import { ConfigService } from '../services/config.service'
import { ThemesService } from '../services/themes.service'
import { UpdaterService } from '../services/updater.service'

import { BaseTabComponent } from './baseTab.component'
import { SafeModeModalComponent } from './safeModeModal.component'
import { TabBodyComponent } from './tabBody.component'
import { AppService, FileTransfer, HostWindowService, PlatformService, ToolbarButton, ToolbarButtonProvider } from '../api'

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
    @ViewChildren(TabBodyComponent) tabBodies: TabBodyComponent[]
    unsortedTabs: BaseTabComponent[] = []
    updatesAvailable = false
    activeTransfers: FileTransfer[] = []
    activeTransfersDropdownOpen = false
    private logger: Logger

    constructor (
        private hotkeys: HotkeysService,
        private updater: UpdaterService,
        public hostWindow: HostWindowService,
        public hostApp: HostAppService,
        public config: ConfigService,
        public app: AppService,
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
        platform: PlatformService,
        log: LogService,
        ngbModal: NgbModal,
        _themes: ThemesService,
    ) {
        this.logger = log.create('main')
        this.logger.info('v', platform.getAppVersion())

        this.hotkeys.hotkey$.subscribe((hotkey: string) => {
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
                if (hotkey === 'reopen-tab') {
                    this.app.reopenLastTab()
                }
            }
            if (hotkey === 'toggle-fullscreen') {
                hostWindow.toggleFullscreen()
            }
        })

        this.hostWindow.windowCloseRequest$.subscribe(async () => {
            this.app.closeWindow()
        })

        if (window['safeModeReason']) {
            ngbModal.open(SafeModeModalComponent)
        }

        this.app.tabOpened$.subscribe(tab => {
            this.unsortedTabs.push(tab)
            this.noTabs = false
            this.app.emitTabDragEnded()
        })

        this.app.tabRemoved$.subscribe(tab => {
            for (const tabBody of this.tabBodies) {
                if (tabBody.tab === tab) {
                    tabBody.detach()
                }
            }
            this.unsortedTabs = this.unsortedTabs.filter(x => x !== tab)
            this.noTabs = app.tabs.length === 0
            this.app.emitTabDragEnded()
        })

        platform.fileTransferStarted$.subscribe(transfer => {
            this.activeTransfers.push(transfer)
            this.activeTransfersDropdownOpen = true
        })

        config.ready$.toPromise().then(() => {
            this.leftToolbarButtons = this.getToolbarButtons(false)
            this.rightToolbarButtons = this.getToolbarButtons(true)

            setInterval(() => {
                if (this.config.store.enableAutomaticUpdates) {
                    this.updater.check().then(available => {
                        this.updatesAvailable = available
                    })
                }
            }, 3600 * 12 * 1000)
        })
    }

    async ngOnInit () {
        this.config.ready$.toPromise().then(() => {
            this.ready = true
            this.app.emitReady()
        })
    }

    @HostListener('dragover')
    onDragOver () {
        return false
    }

    @HostListener('drop')
    onDrop () {
        return false
    }

    hasVerticalTabs () {
        return this.config.store.appearance.tabsLocation === 'left' || this.config.store.appearance.tabsLocation === 'right'
    }

    onTabDragStart (tab: BaseTabComponent) {
        this.app.emitTabDragStarted(tab)
    }

    onTabDragEnd () {
        setTimeout(() => {
            this.app.emitTabDragEnded()
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

    onTabsReordered (event: CdkDragDrop<BaseTabComponent[]>) {
        moveItemInArray(this.app.tabs, event.previousIndex, event.currentIndex)
        this.app.emitTabsChanged()
    }

    private getToolbarButtons (aboveZero: boolean): ToolbarButton[] {
        let buttons: ToolbarButton[] = []
        this.config.enabledServices(this.toolbarButtonProviders).forEach(provider => {
            buttons = buttons.concat(provider.provide())
        })
        return buttons
            .filter(button => (button.weight ?? 0) > 0 === aboveZero)
            .sort((a: ToolbarButton, b: ToolbarButton) => (a.weight ?? 0) - (b.weight ?? 0))
    }
}
