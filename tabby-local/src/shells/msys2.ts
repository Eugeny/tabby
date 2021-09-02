import * as fs from 'fs/promises'
import * as path from 'path'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'tabby-core'

import { ShellProvider, Shell } from '../api'

/** @hidden */
@Injectable()
export class MSYS2ShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        const msys2Path = path.resolve(process.env.SystemRoot ?? 'C:\\Windows', '../msys64')
        try {
            await fs.access(msys2Path)
        } catch {
            return []
        }

        const environments = ['msys', 'mingw64', 'clang64', 'ucrt64']

        return environments.map(e => ({
            id: `msys2-${e}`,
            name: `MSYS2 (${e.toUpperCase()})`,
            command: path.join(msys2Path, 'msys2_shell.cmd'),
            args: ['-defterm', '-here', '-no-start', '-' + e],
            icon: require('../icons/msys2.svg'),
            env: {},
        }))
    }
}
