import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'

import { ToolbarButtonProvider, TabRecoveryProvider } from 'api'

import { TerminalTabComponent } from './components/terminalTab'
import { SessionsService } from './services/sessions'
import { ScreenPersistenceProvider } from './persistenceProviders'
import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'
import { SessionPersistenceProvider } from './api'


@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
    ],
    providers: [
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        SessionsService,
        { provide: SessionPersistenceProvider, useClass: ScreenPersistenceProvider },
    ],
    entryComponents: [
        TerminalTabComponent,
    ],
    declarations: [
        TerminalTabComponent,
    ],
})
class TerminalModule {
}


export default TerminalModule
