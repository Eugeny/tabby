import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import TerminusCoreModule, { ToolbarButtonProvider, ConfigProvider, TabRecoveryProvider, HotkeyProvider } from 'terminus-core'
import { SettingsTabProvider } from 'terminus-settings'
import TerminusTerminalModule from 'terminus-terminal'

import { EditConnectionModalComponent } from './components/editConnectionModal.component'
import { SerialSettingsTabComponent } from './components/serialSettingsTab.component'
import { SerialTabComponent } from './components/serialTab.component'

import { ButtonProvider } from './buttonProvider'
import { SerialConfigProvider } from './config'
import { SerialSettingsTabProvider } from './settings'
import { RecoveryProvider } from './recoveryProvider'
import { SerialHotkeyProvider } from './hotkeys'

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
        { provide: ConfigProvider, useClass: SerialConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: SerialSettingsTabProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: HotkeyProvider, useClass: SerialHotkeyProvider, multi: true },
    ],
    entryComponents: [
        EditConnectionModalComponent,
        SerialSettingsTabComponent,
        SerialTabComponent,
    ],
    declarations: [
        EditConnectionModalComponent,
        SerialSettingsTabComponent,
        SerialTabComponent,
    ],
})
export default class SerialModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
