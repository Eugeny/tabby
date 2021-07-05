import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import { NgxFilesizeModule } from 'ngx-filesize'
import TabbyCoreModule, { ConfigProvider, TabRecoveryProvider, HotkeyProvider, TabContextMenuItemProvider, ProfileProvider, HotkeysService, ProfilesService, AppService, SelectorService, SelectorOption } from 'tabby-core'
import { SettingsTabComponent, SettingsTabProvider } from 'tabby-settings'
import TabbyTerminalModule from 'tabby-terminal'

import { SSHProfileSettingsComponent } from './components/sshProfileSettings.component'
import { SSHPortForwardingModalComponent } from './components/sshPortForwardingModal.component'
import { SSHPortForwardingConfigComponent } from './components/sshPortForwardingConfig.component'
import { SSHSettingsTabComponent } from './components/sshSettingsTab.component'
import { SSHTabComponent } from './components/sshTab.component'
import { SFTPPanelComponent } from './components/sftpPanel.component'
import { SFTPDeleteModalComponent } from './components/sftpDeleteModal.component'

import { SSHConfigProvider } from './config'
import { SSHSettingsTabProvider } from './settings'
import { RecoveryProvider } from './recoveryProvider'
import { SSHHotkeyProvider } from './hotkeys'
import { SFTPContextMenu } from './tabContextMenu'
import { SSHProfilesService } from './profiles'

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
        { provide: ConfigProvider, useClass: SSHConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: SSHSettingsTabProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: HotkeyProvider, useClass: SSHHotkeyProvider, multi: true },
        { provide: TabContextMenuItemProvider, useClass: SFTPContextMenu, multi: true },
        { provide: ProfileProvider, useExisting: SSHProfilesService, multi: true },
    ],
    entryComponents: [
        SSHProfileSettingsComponent,
        SFTPDeleteModalComponent,
        SSHPortForwardingModalComponent,
        SSHSettingsTabComponent,
        SSHTabComponent,
    ],
    declarations: [
        SSHProfileSettingsComponent,
        SFTPDeleteModalComponent,
        SSHPortForwardingModalComponent,
        SSHPortForwardingConfigComponent,
        SSHSettingsTabComponent,
        SSHTabComponent,
        SFTPPanelComponent,
    ],
})
export default class SSHModule {
    constructor (
        hotkeys: HotkeysService,
        private app: AppService,
        private selector: SelectorService,
        private profilesService: ProfilesService,
        private sshProfiles: SSHProfilesService,
    ) {
        hotkeys.hotkey$.subscribe(hotkey => {
            if (hotkey === 'ssh-profile-selector') {
                this.showSelector()
            }
        })
    }

    async showSelector (): Promise<void> {
        let profiles = await this.profilesService.getProfiles()

        profiles = profiles.filter(x => !x.isTemplate && x.type === 'ssh')

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
                this.sshProfiles.quickConnect(query)
            ),
        })

        await this.selector.show('Select an SSH profile', options)
    }
}
