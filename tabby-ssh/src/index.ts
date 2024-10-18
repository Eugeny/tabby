import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import { NgxFilesizeModule } from 'ngx-filesize'
import TabbyCoreModule, { ConfigProvider, TabRecoveryProvider, HotkeyProvider, TabContextMenuItemProvider, ProfileProvider } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import TabbyTerminalModule from 'tabby-terminal'

import { SSHProfileSettingsComponent } from './components/sshProfileSettings.component'
import { SSHPortForwardingModalComponent } from './components/sshPortForwardingModal.component'
import { SSHPortForwardingConfigComponent } from './components/sshPortForwardingConfig.component'
import { SSHSettingsTabComponent } from './components/sshSettingsTab.component'
import { SSHTabComponent } from './components/sshTab.component'
import { SFTPPanelComponent } from './components/sftpPanel.component'
import { SFTPDeleteModalComponent } from './components/sftpDeleteModal.component'
import { KeyboardInteractiveAuthComponent } from './components/keyboardInteractiveAuthPanel.component'
import { HostKeyPromptModalComponent } from './components/hostKeyPromptModal.component'

import { SSHConfigProvider } from './config'
import { SSHSettingsTabProvider } from './settings'
import { RecoveryProvider } from './recoveryProvider'
import { SSHHotkeyProvider } from './hotkeys'
import { SFTPContextMenu } from './tabContextMenu'
import { SSHProfilesService } from './profiles'
import { SFTPContextMenuItemProvider } from './api/contextMenu'
import { CommonSFTPContextMenu } from './sftpContextMenu'
import { SFTPCreateDirectoryModalComponent } from './components/sftpCreateDirectoryModal.component'

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
        { provide: SFTPContextMenuItemProvider, useClass: CommonSFTPContextMenu, multi: true },
    ],
    declarations: [
        SSHProfileSettingsComponent,
        SFTPDeleteModalComponent,
        SFTPCreateDirectoryModalComponent,
        SSHPortForwardingModalComponent,
        SSHPortForwardingConfigComponent,
        SSHSettingsTabComponent,
        SSHTabComponent,
        SFTPPanelComponent,
        KeyboardInteractiveAuthComponent,
        HostKeyPromptModalComponent,
    ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class SSHModule { }

export * from './api'
export { SFTPFile, SFTPSession } from './session/sftp'
export { SFTPPanelComponent }
