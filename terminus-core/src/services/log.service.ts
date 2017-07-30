import { Injectable } from '@angular/core'

export class Logger {
    constructor (
        private name: string,
    ) {}

    doLog (level: string, ...args: any[]) {
        console[level](`%c[${this.name}]`, 'color: #aaa', ...args)
    }

    debug (...args: any[]) { this.doLog('debug', ...args) }
    info (...args: any[]) { this.doLog('info', ...args) }
    warn (...args: any[]) { this.doLog('warn', ...args) }
    error (...args: any[]) { this.doLog('error', ...args) }
    log (...args: any[]) { this.doLog('log', ...args) }
}

@Injectable()
export class LogService {
    create (name: string): Logger {
        return new Logger(name)
    }
}
