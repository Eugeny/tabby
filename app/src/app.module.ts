import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { HttpModule } from '@angular/http'
import { FormsModule } from '@angular/forms'
import { ToasterModule } from 'angular2-toaster'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import { AppService } from 'services/app'
import { ConfigService } from 'services/config'
import { ElectronService } from 'services/electron'
import { HostAppService } from 'services/hostApp'
import { LogService } from 'services/log'
import { HotkeysService, AppHotkeyProvider } from 'services/hotkeys'
import { ModalService } from 'services/modal'
import { NotifyService } from 'services/notify'
import { PluginsService } from 'services/plugins'
import { QuitterService } from 'services/quitter'
import { DockingService } from 'services/docking'

import { AppRootComponent } from 'components/appRoot'
import { CheckboxComponent } from 'components/checkbox'
import { TabBodyComponent } from 'components/tabBody'
import { TabHeaderComponent } from 'components/tabHeader'
import { TitleBarComponent } from 'components/titleBar'

import { HotkeyProvider } from 'api/hotkeyProvider'


let plugins = [
    require('./settings').default,
    require('./terminal').default,
    require('./link-highlighter').default,
]

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpModule,
        FormsModule,
        ToasterModule,
        NgbModule.forRoot(),
    ].concat(plugins),
    providers: [
        AppService,
        ConfigService,
        DockingService,
        ElectronService,
        HostAppService,
        HotkeysService,
        LogService,
        ModalService,
        NotifyService,
        PluginsService,
        QuitterService,
        { provide: HotkeyProvider, useClass: AppHotkeyProvider, multi: true },
    ],
    entryComponents: [
    ],
    declarations: [
        AppRootComponent,
        CheckboxComponent,
        TabBodyComponent,
        TabHeaderComponent,
        TitleBarComponent,
    ],
    bootstrap: [
        AppRootComponent,
    ]
})
export class AppModule {
}
