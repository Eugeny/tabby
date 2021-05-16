import { Injectable } from '@angular/core'
import { HostAppService } from './services/hostApp.service'
import { CLIHandler, CLIEvent } from './api/cli'

@Injectable()
export class LastCLIHandler extends CLIHandler {
    firstMatchOnly = true
    priority = -999

    constructor (private hostApp: HostAppService) {
        super()
    }

    async handle (event: CLIEvent): Promise<boolean> {
        if (event.secondInstance) {
            this.hostApp.newWindow()
            return true
        }
        return false
    }
}
