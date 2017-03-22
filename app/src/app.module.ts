import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { HttpModule } from '@angular/http'
import { FormsModule } from '@angular/forms'
import { ToasterModule } from 'angular2-toaster'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import { ConfigService } from 'services/config'
import { ElectronService } from 'services/electron'
import { HostAppService } from 'services/hostApp'
import { LogService } from 'services/log'
import { HotkeysService } from 'services/hotkeys'
import { ModalService } from 'services/modal'
import { NotifyService } from 'services/notify'
import { PluginDispatcherService } from 'services/pluginDispatcher'
import { QuitterService } from 'services/quitter'
import { SessionsService } from 'services/sessions'
import { DockingService } from 'services/docking'

import { AppComponent } from 'components/app'
import { CheckboxComponent } from 'components/checkbox'
import { HotkeyInputComponent } from 'components/hotkeyInput'
import { HotkeyDisplayComponent } from 'components/hotkeyDisplay'
import { HotkeyHintComponent } from 'components/hotkeyHint'
import { HotkeyInputModalComponent } from 'components/hotkeyInputModal'
import { SettingsPaneComponent } from 'components/settingsPane'
import { TabBodyComponent } from 'components/tabBody'
import { TabHeaderComponent } from 'components/tabHeader'
import { TerminalTabComponent } from 'components/terminalTab'


@NgModule({
    imports: [
        BrowserModule,
        HttpModule,
        FormsModule,
        ToasterModule,
        NgbModule.forRoot(),
    ],
    providers: [
        ConfigService,
        DockingService,
        ElectronService,
        HostAppService,
        HotkeysService,
        LogService,
        ModalService,
        NotifyService,
        PluginDispatcherService,
        QuitterService,
        SessionsService,
    ],
    entryComponents: [
        HotkeyInputModalComponent,
        SettingsPaneComponent,
        TerminalTabComponent,
    ],
    declarations: [
        AppComponent,
        CheckboxComponent,
        HotkeyDisplayComponent,
        HotkeyHintComponent,
        HotkeyInputComponent,
        HotkeyInputModalComponent,
        SettingsPaneComponent,
        TabBodyComponent,
        TabHeaderComponent,
        TerminalTabComponent,
    ],
    bootstrap: [
        AppComponent,
    ]
})
export class AppModule {
    constructor (pluginDispatcher: PluginDispatcherService) {
        pluginDispatcher.register(require('./plugin.hyperlinks').default)
    }
}
