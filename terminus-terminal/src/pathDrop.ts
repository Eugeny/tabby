import { Subscription } from 'rxjs'
import { Injectable } from '@angular/core'
import { TerminalDecorator } from './api/decorator'
import { TerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable()
export class PathDropDecorator extends TerminalDecorator {
    private subscriptions: Subscription[] = []

    attach (terminal: TerminalTabComponent): void {
        setTimeout(() => {
            this.subscriptions = [
                terminal.frontend.dragOver$.subscribe(event => {
                    event.preventDefault()
                }),
                terminal.frontend.drop$.subscribe(event => {
                    for (const file of event.dataTransfer.files as any) {
                        this.injectPath(terminal, file.path)
                    }
                    event.preventDefault()
                }),
            ]
        })
    }

    injectPath (terminal: TerminalTabComponent, path: string) {
        if (path.includes(' ')) {
            path = `"${path}"`
        }
        path = path.replace(/\\/g, '\\\\')
        terminal.sendInput(path + ' ')
    }

    detach (_terminal: TerminalTabComponent): void {
        for (const s of this.subscriptions) {
            s.unsubscribe()
        }
    }
}
