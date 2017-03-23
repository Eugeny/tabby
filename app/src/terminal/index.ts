import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { TerminalTabComponent } from './components/terminalTab'
import { SessionsService } from './services/sessions'
import { TerminalTab } from './tab'

import { PluginDispatcherService } from 'services/pluginDispatcher'


@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
    ],
    providers: [
        SessionsService,
    ],
    entryComponents: [
        TerminalTabComponent,
    ],
    declarations: [
        TerminalTabComponent,
    ],
})
class TerminalModule {
    constructor (pluginDispatcher: PluginDispatcherService, sessions: SessionsService) {
        pluginDispatcher.temp2 = (command) => {
            let session = sessions.createNewSession({ command }))
            return new TerminalTab(session)
        }
    }
}


export default TerminalModule
