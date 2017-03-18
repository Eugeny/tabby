import { Component, ElementRef, trigger, style, animate, transition, state } from '@angular/core'
import { ToasterConfig } from 'angular2-toaster'

import { ElectronService } from 'services/electron'
import { HostAppService } from 'services/hostApp'
import { HotkeysService } from 'services/hotkeys'
import { LogService } from 'services/log'
import { QuitterService } from 'services/quitter'
import { ConfigService } from 'services/config'
import { Session, SessionsService } from 'services/sessions'

import 'angular2-toaster/lib/toaster.css'
import 'global.less'


const TYPE_TERMINAL = 'terminal'
const TYPE_SETTINGS = 'settings'

class Tab {
    id: number
    name: string
    static lastTabID = 0

    constructor (public type: string, public session: Session) {
        this.id = Tab.lastTabID++
        if (type == TYPE_SETTINGS) {
            this.name = 'Settings'
        }
    }
}


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
    tabs: Tab[] = []
    activeTab: Tab
    lastTabIndex = 0

    constructor(
        private elementRef: ElementRef,
        private sessions: SessionsService,
        public hostApp: HostAppService,
        public hotkeys: HotkeysService,
        public config: ConfigService,
        log: LogService,
        electron: ElectronService,
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
    }

    newTab () {
        this.addTerminalTab(this.sessions.createNewSession({command: 'bash'}))
    }

    addTerminalTab (session) {
        let tab = new Tab(TYPE_TERMINAL, session)
        this.tabs.push(tab)
        this.selectTab(tab)
    }

    selectTab (tab) {
        if (this.tabs.includes(this.activeTab)) {
            this.lastTabIndex = this.tabs.indexOf(this.activeTab)
        } else {
            this.lastTabIndex = null
        }
        this.activeTab = tab
        setImmediate(() => {
            let iframe = this.elementRef.nativeElement.querySelector(':scope .tab.active iframe')
            if (iframe) {
                iframe.focus()
            }
        })
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
        if (tab.session) {
            tab.session.gracefullyDestroy()
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
                this.newTab()
            }
        })
    }

    ngOnDestroy () {
    }

    showSettings() {
        let settingsTab = this.tabs.find((x) => x.type == TYPE_SETTINGS)
        if (!settingsTab) {
            settingsTab = new Tab(TYPE_SETTINGS, null)
            this.tabs.push(settingsTab)
        }
        this.selectTab(settingsTab)
    }
}
