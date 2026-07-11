import { Injectable } from '@angular/core'
import { TerminalDecorator, BaseTerminalTabComponent, BaseTerminalProfile } from 'tabby-terminal'
import { webUtils } from 'electron'
import { ShellType, TerminalTabComponent } from 'tabby-local'

/** @hidden */
@Injectable()
export class PathDropDecorator extends TerminalDecorator {
    attach (terminal: BaseTerminalTabComponent<BaseTerminalProfile>): void {
        setTimeout(() => {
            this.subscribeUntilDetached(terminal, terminal.frontend?.dragOver$.subscribe(event => {
                event.preventDefault()
            }))
            this.subscribeUntilDetached(terminal, terminal.frontend?.drop$.subscribe((event: DragEvent) => {
                for (const file of event.dataTransfer!.files as unknown as Iterable<File>) {
                    this.injectPath(terminal, webUtils.getPathForFile(file))
                }
                event.preventDefault()
            }))
        })
    }

    private injectPath (terminal: BaseTerminalTabComponent<BaseTerminalProfile>, path: string) {
        const shellType = this.getShellType(terminal)
        let data = this.quotePath(path, shellType) + ' '

        if (terminal.config.store.terminal.bracketedPaste && terminal.frontend?.supportsBracketedPaste()) {
            data = `\x1b[200~${data}\x1b[201~`
        }

        terminal.sendInput(data)
    }

    private getShellType (terminal: BaseTerminalTabComponent<BaseTerminalProfile>): ShellType {
        const profileShellType = terminal instanceof TerminalTabComponent ? terminal.profile.options.shellType : null

        return profileShellType ?? 'unix'
    }

    private quotePath (path: string, shellType: ShellType): string {
        path = path.replace(/[\x00-\x1F\x7F]/g, '')

        if (shellType === 'powershell') {
            return this.quoteForPowerShell(path)
        }

        if (shellType === 'cmd') {
            return this.quoteForCmd(path)
        }

        return this.quoteForUnix(path)
    }

    private quoteForUnix (path: string): string {
        return `'${path.replace(/'/g, `'\\''`)}'`
    }

    private quoteForPowerShell (path: string): string {
        // double any single-quote-class chars already present
        return `'${path.replace(/['\u2018\u2019\u201A\u201B]/g, m => m + m)}'`
    }

    private quoteForCmd (path: string): string {
        if (!path) {
            return '""'
        }
        const escaped = path
            .replace(/\^/g, '^^')
            .replace(/!/g, '^!')
            .replace(/"/g, '""')
            .replace(/%/g, '%%')
        return `"${escaped}"`
    }
}
