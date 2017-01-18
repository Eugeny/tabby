import { Component, ElementRef, trigger, style, animate, transition, state } from '@angular/core'
import { ModalService } from 'services/modal'
import { ElectronService } from 'services/electron'
import { HostAppService } from 'services/hostApp'
import { HotkeysService } from 'services/hotkeys'
import { LogService } from 'services/log'
import { QuitterService } from 'services/quitter'
import { ToasterConfig } from 'angular2-toaster'
import { Session, SessionsService } from 'services/sessions'

import { SettingsModalComponent } from 'components/settingsModal'

import 'angular2-toaster/lib/toaster.css'
import 'global.less'


class Tab {
    id: number
    name: string
    static lastTabID = 0

    constructor (public session: Session) {
        this.id = Tab.lastTabID++
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
        private modal: ModalService,
        private elementRef: ElementRef,
        private sessions: SessionsService,
        public hostApp: HostAppService,
        public hotkeys: HotkeysService,
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
        this.addSessionTab(this.sessions.createNewSession({command: 'bash'}))
    }

    addSessionTab (session) {
        let tab = new Tab(session)
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
            this.elementRef.nativeElement.querySelector(':scope .tab.active iframe').focus()
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
        tab.session.gracefullyDestroy()
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
                    this.addSessionTab(session)
                })
            } else {
                this.newTab()
            }
        })
    }

    ngOnDestroy () {
    }

    showSettings() {
        this.modal.open(SettingsModalComponent)
    }
}
