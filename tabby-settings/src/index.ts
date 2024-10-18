import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { InfiniteScrollModule } from 'ngx-infinite-scroll'

import TabbyCorePlugin, { HotkeyProvider, ConfigProvider, HotkeysService, AppService, CommandProvider } from 'tabby-core'

import { EditProfileModalComponent } from './components/editProfileModal.component'
import { EditProfileGroupModalComponent } from './components/editProfileGroupModal.component'
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
import { ShowSecretModalComponent } from './components/showSecretModal.component'

import { ConfigSyncService } from './services/configSync.service'

import { SettingsTabProvider } from './api'
import { SettingsCommandProvider } from './commands'
import { SettingsHotkeyProvider } from './hotkeys'
import { SettingsConfigProvider } from './config'
import { HotkeySettingsTabProvider, WindowSettingsTabProvider, VaultSettingsTabProvider, ProfilesSettingsTabProvider, ConfigSyncSettingsTabProvider } from './settings'

/** @hidden */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        NgbModule,
        TabbyCorePlugin,
        InfiniteScrollModule,
    ],
    providers: [
        { provide: CommandProvider, useExisting: SettingsCommandProvider, multi: true },
        { provide: ConfigProvider, useClass: SettingsConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: SettingsHotkeyProvider, multi: true },
        { provide: SettingsTabProvider, useClass: HotkeySettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: WindowSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: VaultSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: ProfilesSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: ConfigSyncSettingsTabProvider, multi: true },
    ],
    declarations: [
        EditProfileModalComponent,
        EditProfileGroupModalComponent,
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
        ShowSecretModalComponent,
    ],
})
export default class SettingsModule {
    constructor (
        public configSync: ConfigSyncService,
        app: AppService,
        hotkeys: HotkeysService,
    ) {
        hotkeys.hotkey$.subscribe(async hotkey => {
            if (hotkey.startsWith('settings-tab.')) {
                const id = hotkey.substring(hotkey.indexOf('.') + 1)
                app.openNewTabRaw({
                    type: SettingsTabComponent,
                    inputs: { activeTab: id },
                })
            }
        })
    }
}

export * from './api'
export { SettingsTabComponent }
