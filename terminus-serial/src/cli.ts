import { Injectable } from '@angular/core'
import { CLIHandler, CLIEvent, ConfigService } from 'terminus-core'
import { SerialService } from './services/serial.service'

@Injectable()
export class SerialCLIHandler extends CLIHandler {
    firstMatchOnly = true
    priority = 0

    constructor (
        private serial: SerialService,
        private config: ConfigService,
    ) {
        super()
    }

    async handle (event: CLIEvent): Promise<boolean> {
        const op = event.argv._[0]

        if (op === 'connect-serial') {
            const connection = this.config.store.serial.connections.find(x => x.name === event.argv.connectionName)
            if (connection) {
                this.serial.connect(connection)
            }
            return true
        }

        return false
    }
}
