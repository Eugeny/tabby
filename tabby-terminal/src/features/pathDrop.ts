import { Injectable } from '@angular/core'
import { TerminalDecorator } from '../api/decorator'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'

/** @hidden */
@Injectable()
export class PathDropDecorator extends TerminalDecorator {
    attach (terminal: BaseTerminalTabComponent): void {
        setTimeout(() => {
            this.subscribeUntilDetached(terminal, terminal.frontend?.dragOver$.subscribe(event => {
                event.preventDefault()
            }))
            this.subscribeUntilDetached(terminal, terminal.frontend?.drop$.subscribe((event: DragEvent) => {
                for (const file of event.dataTransfer!.files as any) {
                    this.injectPath(terminal, file.path)
                }
                event.preventDefault()
            }))
        })
    }

    private injectPath (terminal: BaseTerminalTabComponent, path: string) {
        if (path.includes(' ')) {
            path = `"${path}"`
        }
        path = path.replaceAll('\\', '\\\\')
        terminal.sendInput(path + ' ')
    }
}
