import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import { HotkeyInputComponent } from './components/hotkeyInput'
import { HotkeyDisplayComponent } from './components/hotkeyDisplay'
import { HotkeyHintComponent } from './components/hotkeyHint'
import { HotkeyInputModalComponent } from './components/hotkeyInputModal'
import { SettingsPaneComponent } from './components/settingsPane'

import { PluginsService, ToolbarButtonProviderType, TabRecoveryProviderType } from 'api'

import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'


@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
    ],
    providers: [
        ButtonProvider,
        RecoveryProvider,
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
    constructor (
        plugins: PluginsService,
        buttonProvider: ButtonProvider,
        recoveryProvider: RecoveryProvider,
    ) {
        plugins.register(ToolbarButtonProviderType, buttonProvider, 1)
        plugins.register(TabRecoveryProviderType, recoveryProvider)
    }
}


export default SettingsModule
