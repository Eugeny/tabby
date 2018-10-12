import { Component } from '@angular/core'
import { ConfigService } from 'terminus-core'

@Component({
    template: require('./terminalSettingsTab.component.pug'),
})
export class TerminalSettingsTabComponent {
    constructor (
        public config: ConfigService,
    ) { }
}
