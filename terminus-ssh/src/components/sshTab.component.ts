import { Component } from '@angular/core'
import { TerminalTabComponent } from 'terminus-terminal'

@Component({
    template: `
        <div
            #content
            class="content"
        ></div>
    `,
    styles: [require('./sshTab.component.scss')],
})
export class SSHTabComponent extends TerminalTabComponent {
}
