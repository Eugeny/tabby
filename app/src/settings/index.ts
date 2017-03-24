import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import { HotkeyInputComponent } from './components/hotkeyInput'
import { HotkeyDisplayComponent } from './components/hotkeyDisplay'
import { HotkeyHintComponent } from './components/hotkeyHint'
import { HotkeyInputModalComponent } from './components/hotkeyInputModal'
import { SettingsPaneComponent } from './components/settingsPane'

import { PluginsService, ToolbarButtonProviderType } from 'api'

import { ButtonProvider } from './buttonProvider'


@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
    ],
    providers: [
        ButtonProvider,
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
    constructor (plugins: PluginsService, buttonProvider: ButtonProvider) {
        plugins.register(ToolbarButtonProviderType, buttonProvider, 1)
    }
}


export default SettingsModule
