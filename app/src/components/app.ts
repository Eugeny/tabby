import { Component, ElementRef } from '@angular/core'
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
        element: ElementRef,
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
    tabs: Session[] = []

    newTab () {
        this.tabs.push(this.sessions.createSession({command: 'zsh'}))
    }

    closeTab (session) {
        session.destroy()
    }

    ngOnInit () {
    }

    ngOnDestroy () {
    }

    showSettings() {
        this.modal.open(SettingsModalComponent)
    }
}
