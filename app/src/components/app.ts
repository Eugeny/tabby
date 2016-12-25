import { Component } from '@angular/core'
import { ModalService } from 'services/modal'
import { ElectronService } from 'services/electron'
import { HostAppService } from 'services/hostApp'
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
})
export class AppComponent {
    constructor(
        private hostApp: HostAppService,
        private modal: ModalService,
        private electron: ElectronService,
        private sessions: SessionsService,
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
    }

    toasterConfig: ToasterConfig
    tabs: Tab[] = []
    activeTab: Tab

    newTab () {
        const tab = new Tab(this.sessions.createSession({command: 'bash'}))
        this.tabs.push(tab)
        this.selectTab(tab)
    }

    selectTab (tab) {
        this.activeTab = tab
    }

    closeTab (tab) {
        tab.session.destroy()
        this.tabs = this.tabs.filter((x) => x != tab)
        this.selectTab(this.tabs[0])
    }

    ngOnInit () {
        this.newTab()
    }

    ngOnDestroy () {
    }

    showSettings() {
        this.modal.open(SettingsModalComponent)
    }
}
