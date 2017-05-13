import * as fs from 'fs'
const untildify = require('untildify')
import { Injectable } from '@angular/core'
import { ElectronService } from 'terminus-core'

import { LinkHandler } from './api'

@Injectable()
export class URLHandler extends LinkHandler {
    regex = 'http(s)?://[^\\s;\'"]+[^,;\\s]'

    constructor (private electron: ElectronService) {
        super()
    }

    handle (uri: string) {
        this.electron.shell.openExternal(uri)
    }
}

@Injectable()
export class FileHandler extends LinkHandler {
    regex = '[~/][^\\s,;\'"]+'

    constructor (private electron: ElectronService) {
        super()
    }

    convert (uri: string): string {
        return untildify(uri)
    }

    verify (uri: string) {
        return fs.existsSync(uri)
    }

    handle (uri: string) {
        this.electron.shell.openExternal('file://' + uri)
    }
}
