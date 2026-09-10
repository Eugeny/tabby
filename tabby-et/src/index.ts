import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import TabbyCoreModule, { ConfigProvider, HotkeyProvider, ProfileProvider, TabRecoveryProvider } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import TabbyTerminalModule from 'tabby-terminal'
import TabbySSHModule from 'tabby-ssh'

import { ETTabComponent } from './components/etTab.component'
import { ETProfileSettingsComponent } from './components/etProfileSettings.component'
import { ETPortForwardingConfigComponent } from './components/etPortForwardingConfig.component'
import { ETPortForwardingModalComponent } from './components/etPortForwardingModal.component'
import { ETSettingsTabComponent } from './components/etSettingsTab.component'

import { ETConfigProvider } from './config'
import { ETHotkeyProvider } from './hotkeys'
import { ETProfilesService } from './profiles'
import { ETSettingsTabProvider } from './settings'
import { RecoveryProvider } from './recoveryProvider'

/** @hidden */
@NgModule({
    imports: [
        NgbModule,
        CommonModule,
        FormsModule,
        ToastrModule,
        TabbyCoreModule,
        TabbyTerminalModule,
        // Needed for <keyboard-interactive-auth-panel>, which we reuse for
        // SSH bootstrap prompts.
        TabbySSHModule,
    ],
    providers: [
        { provide: ConfigProvider, useClass: ETConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: ETHotkeyProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: SettingsTabProvider, useClass: ETSettingsTabProvider, multi: true },
        { provide: ProfileProvider, useExisting: ETProfilesService, multi: true },
    ],
    declarations: [
        ETTabComponent,
        ETProfileSettingsComponent,
        ETPortForwardingConfigComponent,
        ETPortForwardingModalComponent,
        ETSettingsTabComponent,
    ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class ETModule { }

export * from './api/interfaces'
export { ETSession } from './session/etSession'
export { ETTabComponent }
