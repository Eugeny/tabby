import * as path from 'path'
import * as fs from 'fs/promises'
import * as which from 'which'
import { ConfigService, HostAppService } from 'tabby-core'

import { ShellProvider } from 'tabby-local'

export abstract class WindowsBaseShellProvider extends ShellProvider {
    constructor (
        protected hostApp: HostAppService,
        protected config: ConfigService,
    ) {
        super()
    }

    protected getEnvironment (): any {
        return {
            wt: {
                WT_SESSION: 0,
            },
            cygwin: {
                TERM: 'cygwin',
            },
        }[this.config.store.terminal.identification] ?? {}
    }

    /**
     * Looks for an executable at well-known paths before searching PATH.
     */
    protected async findExecutable (wellKnownPaths: string[], name: string): Promise<string|null> {
        for (const execPath of wellKnownPaths) {
            if (await this.fileExists(execPath)) {
                return execPath
            }
        }
        return which(name, { nothrow: true })
    }

    /**
     * Windows App Execution Aliases can fail fs.stat even when runnable.
     * Listing the parent directory avoids resolving their reparse targets.
     */
    private async fileExists (filePath: string): Promise<boolean> {
        try {
            await fs.stat(filePath)
            return true
        } catch { }
        try {
            const targetName = path.basename(filePath).toLowerCase()
            const names = await fs.readdir(path.dirname(filePath))
            return names.some(name => name.toLowerCase() === targetName)
        } catch {
            return false
        }
    }
}
