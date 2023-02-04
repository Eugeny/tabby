import * as fs from 'fs/promises'
import * as path from 'path'
import untildify from 'untildify'
import { Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { PlatformService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'

import { LinkHandler } from './api'

@Injectable()
export class URLHandler extends LinkHandler {
    // From https://urlregex.com/
    // with "-" added to last group (https://github.com/Eugeny/tabby/issues/5611)
    regex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((:((6553[0-5])|(655[0-2][0-9])|(65[0-4][0-9]{2})|(6[0-4][0-9]{3})|([1-5][0-9]{4})|([0-5]{1,5})|([0-9]{1,4})))?(?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w-]*))?)/

    priority = 5

    constructor (private platform: PlatformService) {
        super()
    }

    handle (uri: string): void {
        this.platform.openExternal(uri)
    }
}

@Injectable()
export class IPHandler extends LinkHandler {
    regex = /\b((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)/

    priority = 4

    constructor (private platform: PlatformService) {
        super()
    }

    handle (uri: string): void {
        this.platform.openExternal(`http://${uri}`)
    }
}

export class BaseFileHandler extends LinkHandler {
    constructor (
        protected toastr: ToastrService,
        protected platform: PlatformService,
    ) {
        super()
    }

    async handle (uri: string): Promise<void> {
        try {
            this.platform.openExternal('file://' + uri)
        } catch (err) {
            this.toastr.error(err.toString())
        }
    }

    async verify (uri: string): Promise<boolean> {
        try {
            await fs.access(uri)
            return true
        } catch {
            return false
        }
    }

    async convert (uri: string, tab?: BaseTerminalTabComponent<any>): Promise<string> {
        let p = untildify(uri)
        if (!path.isAbsolute(p) && tab) {
            const cwd = await tab.session?.getWorkingDirectory()
            if (cwd) {
                p = path.resolve(cwd, p)
            }
        }
        return p
    }
}

@Injectable()
export class UnixFileHandler extends BaseFileHandler {
    // Only absolute and home paths
    regex = /[~]?(\/[\w\d.~-]{1,100})+/

    constructor (
        protected toastr: ToastrService,
        protected platform: PlatformService,
    ) {
        super(toastr, platform)
    }
}


@Injectable()
export class WindowsFileHandler extends BaseFileHandler {
    regex = /(([a-zA-Z]:|\\|~)\\[\w\-()\\\.]{1,1024}|"([a-zA-Z]:|\\)\\[\w\s\-()\\\.]{1,1024}")/

    constructor (
        protected toastr: ToastrService,
        protected platform: PlatformService,
    ) {
        super(toastr, platform)
    }

    convert (uri: string, tab?: BaseTerminalTabComponent<any>): Promise<string> {
        const sanitizedUri = uri.replace(/"/g, '')
        return super.convert(sanitizedUri, tab)
    }
}
