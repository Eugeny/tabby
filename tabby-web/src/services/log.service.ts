import { Injectable } from '@angular/core'
import { ConsoleLogger, Logger } from 'tabby-core'

@Injectable({ providedIn: 'root' })
export class ConsoleLogService {
    create (name: string): Logger {
        return new ConsoleLogger(name)
    }
}
