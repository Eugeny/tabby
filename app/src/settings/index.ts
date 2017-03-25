import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import { HotkeyInputComponent } from './components/hotkeyInput'
import { HotkeyDisplayComponent } from './components/hotkeyDisplay'
import { HotkeyHintComponent } from './components/hotkeyHint'
import { HotkeyInputModalComponent } from './components/hotkeyInputModal'
import { SettingsPaneComponent } from './components/settingsPane'

import { ToolbarButtonProvider, TabRecoveryProvider } from 'api'

import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'


@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
    ],
    providers: [
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true }
    ],
    entryComponents: [
        HotkeyInputModalComponent,
        SettingsPaneComponent,
    ],
    declarations: [
        HotkeyDisplayComponent,
        HotkeyHintComponent,
        HotkeyInputComponent,
        HotkeyInputModalComponent,
        SettingsPaneComponent,
    ],
})
class SettingsModule {
}


export default SettingsModule
