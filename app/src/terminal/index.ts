import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'

import { ToolbarButtonProvider, TabRecoveryProvider } from 'api'

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
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
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
}


export default TerminalModule
