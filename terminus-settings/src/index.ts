import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { NgPipesModule } from 'ngx-pipes'

import TerminusCorePlugin, { ToolbarButtonProvider, TabRecoveryProvider, HotkeyProvider, ConfigProvider } from 'terminus-core'

import { HotkeyInputModalComponent } from './components/hotkeyInputModal.component'
import { MultiHotkeyInputComponent } from './components/multiHotkeyInput.component'
import { SettingsTabComponent } from './components/settingsTab.component'
import { SettingsTabBodyComponent } from './components/settingsTabBody.component'

import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'
import { SettingsHotkeyProvider } from './hotkeys'
import { SettingsConfigProvider } from './config'

/** @hidden */
@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        NgPipesModule,
        TerminusCorePlugin,
    ],
    providers: [
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: ConfigProvider, useClass: SettingsConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: SettingsHotkeyProvider, multi: true },
    ],
    entryComponents: [
        HotkeyInputModalComponent,
        SettingsTabComponent,
    ],
    declarations: [
        HotkeyInputModalComponent,
        MultiHotkeyInputComponent,
        SettingsTabComponent,
        SettingsTabBodyComponent,
    ],
})
export default class SettingsModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class

export * from './api'
export { SettingsTabComponent }
