import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import { NgxFilesizeModule } from 'ngx-filesize'
import TabbyCoreModule, { ConfigProvider, TabRecoveryProvider, HotkeyProvider, ProfileProvider, HotkeysService, AppService, SelectorService, ProfilesService, SelectorOption } from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'
import { SettingsTabComponent } from 'tabby-settings'

import { TelnetProfileSettingsComponent } from './components/telnetProfileSettings.component'
import { TelnetTabComponent } from './components/telnetTab.component'

import { TelnetConfigProvider } from './config'
import { RecoveryProvider } from './recoveryProvider'
import { TelnetHotkeyProvider } from './hotkeys'
import { TelnetProfilesService } from './profiles'

/** @hidden */
@NgModule({
    imports: [
        NgbModule,
        NgxFilesizeModule,
        CommonModule,
        FormsModule,
        ToastrModule,
        TabbyCoreModule,
        TabbyTerminalModule,
    ],
    providers: [
        { provide: ConfigProvider, useClass: TelnetConfigProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: HotkeyProvider, useClass: TelnetHotkeyProvider, multi: true },
        { provide: ProfileProvider, useExisting: TelnetProfilesService, multi: true },
    ],
    entryComponents: [
        TelnetProfileSettingsComponent,
        TelnetTabComponent,
    ],
    declarations: [
        TelnetProfileSettingsComponent,
        TelnetTabComponent,
    ],
})
export default class TelnetModule {
    constructor (
        hotkeys: HotkeysService,
        private app: AppService,
        private selector: SelectorService,
        private profilesService: ProfilesService,
        private telnetProfiles: TelnetProfilesService,
    ) {
        hotkeys.hotkey$.subscribe(hotkey => {
            if (hotkey === 'telnet-profile-selector') {
                this.showSelector()
            }
        })
    }

    async showSelector (): Promise<void> {
        let profiles = await this.profilesService.getProfiles()

        profiles = profiles.filter(x => !x.isTemplate && x.type === 'telnet')

        const options: SelectorOption<void>[] = profiles.map(p => ({
            ...this.profilesService.selectorOptionForProfile(p),
            callback: () => this.profilesService.openNewTabForProfile(p),
        }))

        options.push({
            name: 'Manage profiles',
            icon: 'fas fa-window-restore',
            callback: () => this.app.openNewTabRaw({
                type: SettingsTabComponent,
                inputs: { activeTab: 'profiles' },
            }),
        })

        options.push({
            name: 'Quick connect',
            freeInputPattern: 'Connect to "%s"...',
            icon: 'fas fa-arrow-right',
            callback: query => this.profilesService.openNewTabForProfile(
                this.telnetProfiles.quickConnect(query)
            ),
        })

        await this.selector.show('Select an Telnet profile', options)
    }
}
