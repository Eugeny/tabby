import { Component } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { HomeBaseService } from '../services/homeBase.service'
import { CommandService } from '../services/commands.service'
import { Command, CommandLocation } from '../api/commands'

/** @hidden */
@Component({
    selector: 'start-page',
    template: require('./startPage.component.pug'),
    styles: [require('./startPage.component.scss')],
})
export class StartPageComponent {
    version: string
    commands: Command[] = []

    constructor (
        private domSanitizer: DomSanitizer,
        public homeBase: HomeBaseService,
        commands: CommandService,
    ) {
        commands.getCommands({}).then(c => {
            this.commands = c.filter(x => x.locations?.includes(CommandLocation.StartPage))
        })
    }

    sanitizeIcon (icon?: string): any {
        return this.domSanitizer.bypassSecurityTrustHtml(icon ?? '')
    }

    buttonsTrackBy (btn: Command): any {
        return btn.label + btn.icon
    }
}
