import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { PluginsService, ToolbarButtonProviderType, TabRecoveryProviderType } from 'api'

import { TerminalTabComponent } from './components/terminalTab'
import { SessionsService } from './services/sessions'
import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'


@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
    ],
    providers: [
        ButtonProvider,
        SessionsService,
        RecoveryProvider,
    ],
    entryComponents: [
        TerminalTabComponent,
    ],
    declarations: [
        TerminalTabComponent,
    ],
})
class TerminalModule {
    constructor (
        plugins: PluginsService,
        buttonProvider: ButtonProvider,
        recoveryProvider: RecoveryProvider,
    ) {
        plugins.register(ToolbarButtonProviderType, buttonProvider)
        plugins.register(TabRecoveryProviderType, recoveryProvider)
    }
}


export default TerminalModule
