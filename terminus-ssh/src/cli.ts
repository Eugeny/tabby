import { Injectable } from '@angular/core'
import { CLIHandler, CLIEvent, ConfigService } from 'terminus-core'
import { SSHService } from './services/ssh.service'

@Injectable()
export class SSHCLIHandler extends CLIHandler {
    firstMatchOnly = true
    priority = 0

    constructor (
        private ssh: SSHService,
        private config: ConfigService,
    ) {
        super()
    }

    async handle (event: CLIEvent): Promise<boolean> {
        const op = event.argv._[0]

        if (op === 'connect-ssh') {
            const connection = this.config.store.ssh.connections.find(x => x.name === event.argv.connectionName)
            if (connection) {
                this.ssh.connect(connection)
            }
            return true
        }

        return false
    }
}
