import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { PluginsService, ToolbarButtonProviderType } from 'api'

import { TerminalTabComponent } from './components/terminalTab'
import { SessionsService } from './services/sessions'
import { ButtonProvider } from './buttonProvider'


@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
    ],
    providers: [
        ButtonProvider,
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
    constructor (plugins: PluginsService, buttonProvider: ButtonProvider) {
        plugins.register(ToolbarButtonProviderType, buttonProvider)
    }
}


export default TerminalModule
