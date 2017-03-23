import { Component, Input, trigger, style, animate, transition, state } from '@angular/core'
import { ToasterConfig } from 'angular2-toaster'

import { ElectronService } from 'services/electron'
import { HostAppService } from 'services/hostApp'
import { HotkeysService } from 'services/hotkeys'
import { LogService } from 'services/log'
import { QuitterService } from 'services/quitter'
import { ConfigService } from 'services/config'
import { DockingService } from 'services/docking'
import { SessionsService } from 'services/sessions'

import { Tab, SettingsTab, TerminalTab } from 'models/tab'

import 'angular2-toaster/lib/toaster.css'
import 'global.less'
import 'theme.scss'


@Component({
    selector: 'app',
    template: require('./app.pug'),
    styles: [require('./app.less')],
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
export class AppComponent {
    toasterConfig: ToasterConfig
    @Input() tabs: Tab[] = []
    @Input() activeTab: Tab
    lastTabIndex = 0

    constructor(
        private sessions: SessionsService,
        private docking: DockingService,
        private electron: ElectronService,
        public hostApp: HostAppService,
        public hotkeys: HotkeysService,
        public config: ConfigService,
        log: LogService,
        _quitter: QuitterService,
    ) {
        console.timeStamp('AppComponent ctor')

        let logger = log.create('main')
        logger.info('ELEMENTS client', electron.app.getVersion())

        this.toasterConfig = new ToasterConfig({
            mouseoverTimerStop: true,
            preventDuplicates: true,
            timeout: 4000,
        })

        this.hotkeys.matchedHotkey.subscribe((hotkey) => {
            if (hotkey == 'new-tab') {
                this.newTab()
            }
            if (hotkey.startsWith('tab-')) {
                let index = parseInt(hotkey.split('-')[1])
                if (index <= this.tabs.length) {
                    this.selectTab(this.tabs[index - 1])
                }
            }
            if (this.activeTab) {
                if (hotkey == 'close-tab') {
                    this.closeTab(this.activeTab)
                }
                if (hotkey == 'toggle-last-tab') {
                    this.toggleLastTab()
                }
                if (hotkey == 'next-tab') {
                    this.nextTab()
                }
                if (hotkey == 'previous-tab') {
                    this.previousTab()
                }
            }
        })

        this.hotkeys.key.subscribe((key) => {
            if (key.event == 'keydown') {
                if (key.alt && key.key >= '1' && key.key <= '9') {
                    let index = key.key.charCodeAt(0) - '0'.charCodeAt(0) - 1
                    if (index < this.tabs.length) {
                        this.selectTab(this.tabs[index])
                    }
                }
                if (key.alt && key.key == '0') {
                    if (this.tabs.length >= 10) {
                        this.selectTab(this.tabs[9])
                    }
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
    }

    newTab () {
        this.addTerminalTab(this.sessions.createNewSession({command: 'zsh'}))
    }

    addTerminalTab (session) {
        let tab = new TerminalTab(session)
        this.tabs.push(tab)
        this.selectTab(tab)
    }

    selectTab (tab) {
        if (this.tabs.includes(this.activeTab)) {
            this.lastTabIndex = this.tabs.indexOf(this.activeTab)
        } else {
            this.lastTabIndex = null
        }
        if (this.activeTab) {
            this.activeTab.hasActivity = false
            this.activeTab.blurred.emit()
        }
        this.activeTab = tab
        this.activeTab.focused.emit()
    }

    toggleLastTab () {
        if (!this.lastTabIndex || this.lastTabIndex >= this.tabs.length) {
            this.lastTabIndex = 0
        }
        this.selectTab(this.tabs[this.lastTabIndex])
    }

    nextTab () {
        let tabIndex = this.tabs.indexOf(this.activeTab)
        if (tabIndex < this.tabs.length - 1) {
            this.selectTab(this.tabs[tabIndex + 1])
        }
    }

    previousTab () {
        let tabIndex = this.tabs.indexOf(this.activeTab)
        if (tabIndex > 0) {
            this.selectTab(this.tabs[tabIndex - 1])
        }
    }

    closeTab (tab) {
        tab.destroy()
        if (tab.session) {
            this.sessions.destroySession(tab.session)
        }
        let newIndex = Math.max(0, this.tabs.indexOf(tab) - 1)
        this.tabs = this.tabs.filter((x) => x != tab)
        if (tab == this.activeTab) {
            this.selectTab(this.tabs[newIndex])
        }
    }

    ngOnInit () {
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
    }

    showSettings() {
        let settingsTab = this.tabs.find((x) => x instanceof SettingsTab)
        if (!settingsTab) {
            settingsTab = new SettingsTab()
            this.tabs.push(settingsTab)
        }
        this.selectTab(settingsTab)
    }
}
