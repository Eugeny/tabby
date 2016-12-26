import { Injectable } from '@angular/core'
import { HostAppService } from 'services/hostApp'


@Injectable()
export class QuitterService {
    constructor(
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
