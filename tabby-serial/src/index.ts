import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import TabbyCoreModule, { ConfigProvider, TabRecoveryProvider, HotkeyProvider, ProfileProvider } from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'

import { SerialProfileSettingsComponent } from './components/serialProfileSettings.component'
import { SerialTabComponent } from './components/serialTab.component'

import { SerialConfigProvider } from './config'
import { RecoveryProvider } from './recoveryProvider'
import { SerialHotkeyProvider } from './hotkeys'
import { SerialProfilesService } from './profiles'

/** @hidden */
@NgModule({
    imports: [
        NgbModule,
        CommonModule,
        FormsModule,
        ToastrModule,
        TabbyCoreModule,
        TabbyTerminalModule,
    ],
    providers: [
        { provide: ConfigProvider, useClass: SerialConfigProvider, multi: true },
        { provide: ProfileProvider, useClass: SerialProfilesService, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: HotkeyProvider, useClass: SerialHotkeyProvider, multi: true },
    ],
    entryComponents: [
        SerialProfileSettingsComponent,
        SerialTabComponent,
    ],
    declarations: [
        SerialProfileSettingsComponent,
        SerialTabComponent,
    ],
})
export default class SerialModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
