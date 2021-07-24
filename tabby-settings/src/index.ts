import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { InfiniteScrollModule } from 'ngx-infinite-scroll'

import TabbyCorePlugin, { ToolbarButtonProvider, HotkeyProvider, ConfigProvider } from 'tabby-core'

import { EditProfileModalComponent } from './components/editProfileModal.component'
import { HotkeyInputModalComponent } from './components/hotkeyInputModal.component'
import { HotkeySettingsTabComponent } from './components/hotkeySettingsTab.component'
import { MultiHotkeyInputComponent } from './components/multiHotkeyInput.component'
import { SettingsTabComponent } from './components/settingsTab.component'
import { SettingsTabBodyComponent } from './components/settingsTabBody.component'
import { WindowSettingsTabComponent } from './components/windowSettingsTab.component'
import { VaultSettingsTabComponent }  from './components/vaultSettingsTab.component'
import { SetVaultPassphraseModalComponent } from './components/setVaultPassphraseModal.component'
import { ProfilesSettingsTabComponent } from './components/profilesSettingsTab.component'
import { ReleaseNotesComponent } from './components/releaseNotesTab.component'
import { ConfigSyncSettingsTabComponent } from './components/configSyncSettingsTab.component'

import { ConfigSyncService } from './services/configSync.service'

import { SettingsTabProvider } from './api'
import { ButtonProvider } from './buttonProvider'
import { SettingsHotkeyProvider } from './hotkeys'
import { SettingsConfigProvider } from './config'
import { HotkeySettingsTabProvider, WindowSettingsTabProvider, VaultSettingsTabProvider, ProfilesSettingsTabProvider, ConfigSyncSettingsTabProvider } from './settings'

/** @hidden */
@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        TabbyCorePlugin,
        InfiniteScrollModule,
    ],
    providers: [
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: ConfigProvider, useClass: SettingsConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: SettingsHotkeyProvider, multi: true },
        { provide: SettingsTabProvider, useClass: HotkeySettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: WindowSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: VaultSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: ProfilesSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: ConfigSyncSettingsTabProvider, multi: true },
    ],
    entryComponents: [
        EditProfileModalComponent,
        HotkeyInputModalComponent,
        HotkeySettingsTabComponent,
        ProfilesSettingsTabComponent,
        SettingsTabComponent,
        SetVaultPassphraseModalComponent,
        VaultSettingsTabComponent,
        WindowSettingsTabComponent,
        ConfigSyncSettingsTabComponent,
        ReleaseNotesComponent,
    ],
    declarations: [
        EditProfileModalComponent,
        HotkeyInputModalComponent,
        HotkeySettingsTabComponent,
        MultiHotkeyInputComponent,
        ProfilesSettingsTabComponent,
        SettingsTabComponent,
        SettingsTabBodyComponent,
        SetVaultPassphraseModalComponent,
        VaultSettingsTabComponent,
        WindowSettingsTabComponent,
        ConfigSyncSettingsTabComponent,
        ReleaseNotesComponent,
    ],
})
export default class SettingsModule {
    constructor (public configSync: ConfigSyncService) { }
}

export * from './api'
export { SettingsTabComponent }
