import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import { HotkeyInputComponent } from './components/hotkeyInput'
import { HotkeyDisplayComponent } from './components/hotkeyDisplay'
import { HotkeyHintComponent } from './components/hotkeyHint'
import { HotkeyInputModalComponent } from './components/hotkeyInputModal'
import { SettingsPaneComponent } from './components/settingsPane'
import { PluginDispatcherService } from 'services/pluginDispatcher'

import { SettingsTab } from './tab'

@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
    ],
    providers: [
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
    constructor (pluginDispatcher: PluginDispatcherService) {
        pluginDispatcher.temp = SettingsTab
    }
}


export default SettingsModule
