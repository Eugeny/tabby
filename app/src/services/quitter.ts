import { Injectable } from '@angular/core'
import { HostAppService } from 'services/hostApp'
import { ElectronService } from 'services/electron'


@Injectable()
export class QuitterService {
    constructor(
        private electron: ElectronService,
        private hostApp: HostAppService,
    ) {
        hostApp.quitRequested.subscribe(() => {
            this.quit()
        })
    }

    quit() {
        this.hostApp.setWindowCloseable(true)
        this.hostApp.quit()
    }
}
