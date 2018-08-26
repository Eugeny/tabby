import { Subscription } from 'rxjs'
import { Injectable } from '@angular/core'
import { TerminalDecorator } from './api'
import { TerminalTabComponent } from './components/terminalTab.component'

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
                    for (let file of event.dataTransfer.files as any) {
                        this.injectPath(terminal, file.path)
                    }
                    event.preventDefault()
                }),
            ]
        })
    }

    injectPath (terminal: TerminalTabComponent, path: string) {
        if (path.indexOf(' ') >= 0) {
            path = `"${path}"`
        }
        terminal.sendInput(path + ' ')
    }

    detach (terminal: TerminalTabComponent): void {
        for (let s of this.subscriptions) {
            s.unsubscribe()
        }
    }
}
