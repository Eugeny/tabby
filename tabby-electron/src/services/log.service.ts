import * as fs from 'fs'
import * as path from 'path'
import * as winston from 'winston'
import { Injectable } from '@angular/core'
import { ConsoleLogger, Logger } from 'tabby-core'
import { ElectronService } from '../services/electron.service'

const initializeWinston = (electron: ElectronService) => {
    const logDirectory = electron.app.getPath('userData')
    // eslint-disable-next-line
    const winston = require('winston')

    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory)
    }

    return winston.createLogger({
        transports: [
            new winston.transports.File({
                level: 'debug',
                filename: path.join(logDirectory, 'log.txt'),
                format: winston.format.simple(),
                handleExceptions: false,
                maxsize: 5242880,
                maxFiles: 5,
            }),
        ],
        exitOnError: false,
    })
}

export class WinstonAndConsoleLogger extends ConsoleLogger {
    constructor (private winstonLogger: winston.Logger, name: string) {
        super(name)
    }

    protected doLog (level: string, ...args: any[]): void {
        super.doLog(level, ...args)
        this.winstonLogger[level](...args)
    }
}

@Injectable({ providedIn: 'root' })
export class ElectronLogService {
    private log: winston.Logger

    /** @hidden */
    constructor (electron: ElectronService) {
        this.log = initializeWinston(electron)
    }

    create (name: string): Logger {
        return new WinstonAndConsoleLogger(this.log, name)
    }
}
