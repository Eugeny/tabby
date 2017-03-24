import { Component, trigger, style, animate, transition, state } from '@angular/core'
import { ToasterConfig } from 'angular2-toaster'

import { ElectronService } from 'services/electron'
import { HostAppService } from 'services/hostApp'
import { HotkeysService } from 'services/hotkeys'
import { LogService } from 'services/log'
import { QuitterService } from 'services/quitter'
import { ConfigService } from 'services/config'
import { DockingService } from 'services/docking'
import { PluginsService } from 'services/plugins'

import { AppService, IToolbarButton, IToolbarButtonProvider, ToolbarButtonProviderType } from 'api'

import 'angular2-toaster/lib/toaster.css'
import 'global.less'
import 'theme.scss'


@Component({
    selector: 'app-root',
    template: require('./appRoot.pug'),
    styles: [require('./appRoot.less')],
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

    constructor(
        private docking: DockingService,
        private electron: ElectronService,
        public hostApp: HostAppService,
        public hotkeys: HotkeysService,
        public config: ConfigService,
        private plugins: PluginsService,
        public app: AppService,
        log: LogService,
        _quitter: QuitterService,
    ) {
        console.timeStamp('AppComponent ctor')

        let logger = log.create('main')
        logger.info('v', electron.app.getVersion())

        this.toasterConfig = new ToasterConfig({
            mouseoverTimerStop: true,
            preventDuplicates: true,
            timeout: 4000,
        })

        this.hotkeys.matchedHotkey.subscribe((hotkey) => {
            if (hotkey == 'new-tab') {
                // TODO this.newTab()
            }
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

        this.hotkeys.registerHotkeys()
        this.hotkeys.globalHotkey.subscribe(() => {
            this.hostApp.toggleWindow()
        })

        this.docking.dock()
        this.hostApp.shown.subscribe(() => {
            this.docking.dock()
        })

        this.hostApp.secondInstance.subscribe(() => {
            if (this.electron.app.window.isFocused()) {
                // focused
                this.electron.app.window.hide()
            } else {
                if (!this.electron.app.window.isVisible()) {
                    // unfocused, invisible
                    this.electron.app.window.show()
                } else {
                    if (this.config.full().appearance.dock == 'off') {
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
        })

        this.app.restoreTabs()
    }

    getToolbarButtons (aboveZero: boolean): IToolbarButton[] {
        let buttons: IToolbarButton[] = []
        this.plugins.getAll<IToolbarButtonProvider>(ToolbarButtonProviderType)
            .forEach((provider) => {
                buttons = buttons.concat(provider.provide())
            })
        return buttons
            .filter((button) => (button.weight > 0) === aboveZero)
            .sort((a: IToolbarButton, b: IToolbarButton) => (a.weight || 0) - (b.weight || 0))
    }

    ngOnInit () {
        /*
        this.sessions.recoverAll().then((recoveredSessions) => {
            if (recoveredSessions.length > 0) {
                recoveredSessions.forEach((session) => {
                    this.addTerminalTab(session)
                })
            } else {
                // this.newTab()
                this.showSettings();
            }
        })
        */
    }
}
