import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import { NgxFilesizeModule } from 'ngx-filesize'
import TabbyCoreModule, { ToolbarButtonProvider, ConfigProvider, TabRecoveryProvider, HotkeyProvider, TabContextMenuItemProvider, CLIHandler } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import TabbyTerminalModule from 'tabby-terminal'

import { EditConnectionModalComponent } from './components/editConnectionModal.component'
import { SSHPortForwardingModalComponent } from './components/sshPortForwardingModal.component'
import { SSHPortForwardingConfigComponent } from './components/sshPortForwardingConfig.component'
import { PromptModalComponent } from './components/promptModal.component'
import { SSHSettingsTabComponent } from './components/sshSettingsTab.component'
import { SSHTabComponent } from './components/sshTab.component'
import { SFTPPanelComponent } from './components/sftpPanel.component'
import { SFTPDeleteModalComponent } from './components/sftpDeleteModal.component'

import { ButtonProvider } from './buttonProvider'
import { SSHConfigProvider } from './config'
import { SSHSettingsTabProvider } from './settings'
import { RecoveryProvider } from './recoveryProvider'
import { SSHHotkeyProvider } from './hotkeys'
import { SFTPContextMenu } from './tabContextMenu'
import { SSHCLIHandler } from './cli'

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
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: ConfigProvider, useClass: SSHConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: SSHSettingsTabProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: HotkeyProvider, useClass: SSHHotkeyProvider, multi: true },
        { provide: TabContextMenuItemProvider, useClass: SFTPContextMenu, multi: true },
        { provide: CLIHandler, useClass: SSHCLIHandler, multi: true },
    ],
    entryComponents: [
        EditConnectionModalComponent,
        PromptModalComponent,
        SFTPDeleteModalComponent,
        SSHPortForwardingModalComponent,
        SSHSettingsTabComponent,
        SSHTabComponent,
    ],
    declarations: [
        EditConnectionModalComponent,
        PromptModalComponent,
        SFTPDeleteModalComponent,
        SSHPortForwardingModalComponent,
        SSHPortForwardingConfigComponent,
        SSHSettingsTabComponent,
        SSHTabComponent,
        SFTPPanelComponent,
    ],
})
export default class SSHModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
