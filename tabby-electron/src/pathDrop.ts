import { Injectable } from '@angular/core'
import { TerminalDecorator, BaseTerminalTabComponent } from 'tabby-terminal'
import { webUtils } from 'electron'

/** @hidden */
@Injectable()
export class PathDropDecorator extends TerminalDecorator {
    attach (terminal: BaseTerminalTabComponent<any>): void {
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

    private injectPath (terminal: BaseTerminalTabComponent<any>, path: string) {
        if (path.includes(' ')) {
            path = `"${path}"`
        }
        path = path.replaceAll('\\', '\\\\')
        terminal.sendInput(path + ' ')
    }
}
