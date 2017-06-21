import { Injectable } from '@angular/core'
import { TerminalDecorator } from './api'
import { TerminalTabComponent } from './components/terminalTab.component'


@Injectable()
export class PathDropDecorator extends TerminalDecorator {
    attach (terminal: TerminalTabComponent): void {
        setTimeout(() => {
            terminal.hterm.scrollPort_.document_.addEventListener('dragover', (event) => {
                event.preventDefault()
            })
            terminal.hterm.scrollPort_.document_.addEventListener('drop', (event) => {
                for (let file of event.dataTransfer.files) {
                    this.injectPath(terminal, file.path)
                }
                event.preventDefault()
            })
        })
    }

    injectPath (terminal: TerminalTabComponent, path: string) {
        if (path.indexOf(' ') >= 0) {
            path = `"${path}"`
        }
        terminal.sendInput(path + ' ')
    }

    // tslint:disable-next-line no-empty
    detach (terminal: TerminalTabComponent): void { }
}
