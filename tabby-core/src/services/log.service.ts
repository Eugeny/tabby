export abstract class Logger {
    constructor (protected name: string) { }

    debug (...args: any[]): void {
        this.doLog('debug', ...args)
    }

    info (...args: any[]): void {
        this.doLog('info', ...args)
    }

    warn (...args: any[]): void {
        this.doLog('warn', ...args)
    }

    error (...args: any[]): void {
        this.doLog('error', ...args)
    }

    log (...args: any[]): void {
        this.doLog('log', ...args)
    }

    protected abstract doLog (level: string, ...args: any[]): void
}

export class ConsoleLogger extends Logger {
    protected doLog (level: string, ...args: any[]): void {
        console[level](`%c[${this.name}]`, 'color: #aaa', ...args)
    }
}

export abstract class LogService {
    abstract create (name: string): Logger
}
