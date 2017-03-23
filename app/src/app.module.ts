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
import { TabBodyComponent } from 'components/tabBody'
import { TabHeaderComponent } from 'components/tabHeader'
import { TerminalTabComponent } from 'components/terminalTab'
import { TitleBarComponent } from 'components/titleBar'


let plugins = [
    require('./settings').default,
]

@NgModule({
    imports: [
        BrowserModule,
        HttpModule,
        FormsModule,
        ToasterModule,
        NgbModule.forRoot(),
    ].concat(plugins),
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
        TerminalTabComponent,
    ],
    declarations: [
        AppComponent,
        CheckboxComponent,
        TabBodyComponent,
        TabHeaderComponent,
        TerminalTabComponent,
        TitleBarComponent,
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
