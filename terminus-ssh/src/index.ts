import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import TerminusCoreModule, { ToolbarButtonProvider, ConfigProvider, TabRecoveryProvider, HotkeyProvider, TabContextMenuItemProvider } from 'terminus-core'
import { SettingsTabProvider } from 'terminus-settings'
import TerminusTerminalModule from 'terminus-terminal'

import { EditConnectionModalComponent } from './components/editConnectionModal.component'
import { SSHPortForwardingModalComponent } from './components/sshPortForwardingModal.component'
import { PromptModalComponent } from './components/promptModal.component'
import { SSHSettingsTabComponent } from './components/sshSettingsTab.component'
import { SSHTabComponent } from './components/sshTab.component'

import { ButtonProvider } from './buttonProvider'
import { SSHConfigProvider } from './config'
import { SSHSettingsTabProvider } from './settings'
import { RecoveryProvider } from './recoveryProvider'
import { SSHHotkeyProvider } from './hotkeys'
import { WinSCPContextMenu } from './winSCPIntegration'

/** @hidden */
@NgModule({
    imports: [
        NgbModule,
        CommonModule,
        FormsModule,
        ToastrModule,
        TerminusCoreModule,
        TerminusTerminalModule,
    ],
    providers: [
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: ConfigProvider, useClass: SSHConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: SSHSettingsTabProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: HotkeyProvider, useClass: SSHHotkeyProvider, multi: true },
        { provide: TabContextMenuItemProvider, useClass: WinSCPContextMenu, multi: true },
    ],
    entryComponents: [
        EditConnectionModalComponent,
        PromptModalComponent,
        SSHPortForwardingModalComponent,
        SSHSettingsTabComponent,
        SSHTabComponent,
    ],
    declarations: [
        EditConnectionModalComponent,
        PromptModalComponent,
        SSHPortForwardingModalComponent,
        SSHSettingsTabComponent,
        SSHTabComponent,
    ],
})
export default class SSHModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
