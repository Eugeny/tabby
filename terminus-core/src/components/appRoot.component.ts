import { Component, Inject } from '@angular/core'
import { trigger, style, animate, transition, state } from '@angular/animations'
import { ToasterConfig } from 'angular2-toaster'

import { ElectronService } from '../services/electron.service'
import { HostAppService } from '../services/hostApp.service'
import { HotkeysService } from '../services/hotkeys.service'
import { Logger, LogService } from '../services/log.service'
import { QuitterService } from '../services/quitter.service'
import { ConfigService } from '../services/config.service'
import { DockingService } from '../services/docking.service'
import { TabRecoveryService } from '../services/tabRecovery.service'
import { ThemesService } from '../services/themes.service'

import { AppService, IToolbarButton, ToolbarButtonProvider } from '../api'


@Component({
    selector: 'app-root',
    template: require('./appRoot.component.pug'),
    styles: [require('./appRoot.component.scss')],
    animations: [
        trigger('animateTab', [
            state('in', style({
                'flex-grow': '1000',
            })),
            transition(':enter', [
                style({
                    'flex-grow': '1',
                }),
                animate('250ms ease-in-out')
            ]),
            transition(':leave', [
                animate('250ms ease-in-out', style({
                    'flex-grow': '1',
                }))
            ])
        ])
    ]
})
export class AppRootComponent {
    toasterConfig: ToasterConfig
    logger: Logger

    constructor(
        private docking: DockingService,
        private electron: ElectronService,
        private tabRecovery: TabRecoveryService,
        public hostApp: HostAppService,
        public hotkeys: HotkeysService,
        public config: ConfigService,
        public app: AppService,
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
        log: LogService,
        _themes: ThemesService,
        _quitter: QuitterService,
    ) {
        this.logger = log.create('main')
        this.logger.info('v', electron.app.getVersion())

        this.toasterConfig = new ToasterConfig({
            mouseoverTimerStop: true,
            preventDuplicates: true,
            timeout: 4000,
        })

        this.hotkeys.matchedHotkey.subscribe((hotkey) => {
            if (hotkey.startsWith('tab-')) {
                let index = parseInt(hotkey.split('-')[1])
                if (index <= this.app.tabs.length) {
                    this.app.selectTab(this.app.tabs[index - 1])
                }
            }
            if (this.app.activeTab) {
                if (hotkey == 'close-tab') {
                    this.app.closeTab(this.app.activeTab)
                }
                if (hotkey == 'toggle-last-tab') {
                    this.app.toggleLastTab()
                }
                if (hotkey == 'next-tab') {
                    this.app.nextTab()
                }
                if (hotkey == 'previous-tab') {
                    this.app.previousTab()
                }
            }
        })

        this.docking.dock()
        this.hostApp.shown.subscribe(() => {
            this.docking.dock()
        })

        this.hostApp.secondInstance.subscribe(() => {
            this.onGlobalHotkey()
        })
        this.hotkeys.globalHotkey.subscribe(() => {
            this.onGlobalHotkey()
        })
    }

    onGlobalHotkey () {
        if (this.electron.app.window.isFocused()) {
            // focused
            this.electron.app.window.hide()
        } else {
            if (!this.electron.app.window.isVisible()) {
                // unfocused, invisible
                this.electron.app.window.show()
            } else {
                if (this.config.store.appearance.dock == 'off') {
                    // not docked, visible
                    setTimeout(() => {
                        this.electron.app.window.focus()
                    })
                } else {
                    // docked, visible
                    this.electron.app.window.hide()
                }
            }
        }
        this.docking.dock()
    }

    getLeftToolbarButtons (): IToolbarButton[] { return this.getToolbarButtons(false) }

    getRightToolbarButtons (): IToolbarButton[] { return this.getToolbarButtons(true) }

    async ngOnInit () {
        await this.tabRecovery.recoverTabs()
        this.tabRecovery.saveTabs(this.app.tabs)

        if (this.app.tabs.length == 0) {
            this.app.openDefaultTab()
        }
    }

    private getToolbarButtons (aboveZero: boolean): IToolbarButton[] {
        let buttons: IToolbarButton[] = []
        this.toolbarButtonProviders.forEach((provider) => {
            buttons = buttons.concat(provider.provide())
        })
        return buttons
            .filter((button) => (button.weight > 0) === aboveZero)
            .sort((a: IToolbarButton, b: IToolbarButton) => (a.weight || 0) - (b.weight || 0))
    }

}
