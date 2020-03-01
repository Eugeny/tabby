import { Injectable } from '@angular/core'
import { TerminalDecorator } from '../api/decorator'
import { TerminalTabComponent } from '../components/terminalTab.component'

/** @hidden */
@Injectable()
export class PathDropDecorator extends TerminalDecorator {
    attach (terminal: TerminalTabComponent): void {
        setTimeout(() => {
            this.subscribeUntilDetached(terminal, terminal.frontend.dragOver$.subscribe(event => {
                event.preventDefault()
            }))
            this.subscribeUntilDetached(terminal, terminal.frontend.drop$.subscribe(event => {
                for (const file of event.dataTransfer!.files as any) {
                    this.injectPath(terminal, file.path)
                }
                event.preventDefault()
            }))
        })
    }

    private injectPath (terminal: TerminalTabComponent, path: string) {
        if (path.includes(' ')) {
            path = `"${path}"`
        }
        path = path.replace(/\\/g, '\\\\')
        terminal.sendInput(path + ' ')
    }
}
