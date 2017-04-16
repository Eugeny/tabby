import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { Ng2FilterPipeModule } from 'ng2-filter-pipe'

import { ToolbarButtonProvider, TabRecoveryProvider } from 'terminus-core'

import { HotkeyInputComponent } from './components/hotkeyInput'
import { HotkeyDisplayComponent } from './components/hotkeyDisplay'
import { HotkeyInputModalComponent } from './components/hotkeyInputModal'
import { MultiHotkeyInputComponent } from './components/multiHotkeyInput'
import { SettingsTabComponent } from './components/settingsTab'
import { SettingsTabBodyComponent } from './components/settingsTabBody'

import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'


@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        Ng2FilterPipeModule,
    ],
    providers: [
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true }
    ],
    entryComponents: [
        HotkeyInputModalComponent,
        SettingsTabComponent,
    ],
    declarations: [
        HotkeyDisplayComponent,
        HotkeyInputComponent,
        HotkeyInputModalComponent,
        MultiHotkeyInputComponent,
        SettingsTabComponent,
        SettingsTabBodyComponent,
    ],
})
export default class SettingsModule {
}

export * from './api'
