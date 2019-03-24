import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import TerminusCoreModule, { ToolbarButtonProvider, ConfigProvider, TabRecoveryProvider } from 'terminus-core'
import { SettingsTabProvider } from 'terminus-settings'

import { EditConnectionModalComponent } from './components/editConnectionModal.component'
import { SSHModalComponent } from './components/sshModal.component'
import { PromptModalComponent } from './components/promptModal.component'
import { SSHSettingsTabComponent } from './components/sshSettingsTab.component'
import { SSHTabComponent } from './components/sshTab.component'

import { ButtonProvider } from './buttonProvider'
import { SSHConfigProvider } from './config'
import { SSHSettingsTabProvider } from './settings'
import { RecoveryProvider } from './recoveryProvider'

/** @hidden */
@NgModule({
    imports: [
        NgbModule,
        CommonModule,
        FormsModule,
        ToastrModule,
        TerminusCoreModule,
    ],
    providers: [
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: ConfigProvider, useClass: SSHConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: SSHSettingsTabProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
    ],
    entryComponents: [
        EditConnectionModalComponent,
        PromptModalComponent,
        SSHModalComponent,
        SSHSettingsTabComponent,
        SSHTabComponent,
    ],
    declarations: [
        EditConnectionModalComponent,
        PromptModalComponent,
        SSHModalComponent,
        SSHSettingsTabComponent,
        SSHTabComponent,
    ],
})
export default class SSHModule { }
