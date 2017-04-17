import { NgModule, ModuleWithProviders } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule } from '@angular/forms'
import { ToasterModule } from 'angular2-toaster'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar'

import { AppService } from './services/app.service'
import { ConfigService } from './services/config.service'
import { ElectronService } from './services/electron.service'
import { HostAppService } from './services/hostApp.service'
import { LogService } from './services/log.service'
import { HotkeysService, AppHotkeyProvider } from './services/hotkeys.service'
import { NotifyService } from './services/notify.service'
import { PluginsService } from './services/plugins.service'
import { QuitterService } from './services/quitter.service'
import { DockingService } from './services/docking.service'
import { TabRecoveryService } from './services/tabRecovery.service'
import { ThemesService } from './services/themes.service'

import { AppRootComponent } from './components/appRoot.component'
import { TabBodyComponent } from './components/tabBody.component'
import { StartPageComponent } from './components/startPage.component'
import { TabHeaderComponent } from './components/tabHeader.component'
import { TitleBarComponent } from './components/titleBar.component'

import { HotkeyProvider } from './api/hotkeyProvider'
import { ConfigProvider } from './api/configProvider'
import { Theme } from './api/theme'

import { StandardTheme } from './theme'
import { CoreConfigProvider } from './config'

import 'perfect-scrollbar/dist/css/perfect-scrollbar.css'

const PROVIDERS = [
    AppService,
    ConfigService,
    DockingService,
    ElectronService,
    HostAppService,
    HotkeysService,
    LogService,
    NotifyService,
    PluginsService,
    TabRecoveryService,
    ThemesService,
    QuitterService,
    { provide: HotkeyProvider, useClass: AppHotkeyProvider, multi: true },
    { provide: Theme, useClass: StandardTheme, multi: true },
    { provide: ConfigProvider, useClass: CoreConfigProvider, multi: true },
]


@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ToasterModule,
        NgbModule,
        PerfectScrollbarModule.forRoot({
            suppressScrollX: true,
        }),
    ],
    declarations: [
        AppRootComponent,
        StartPageComponent,
        TabBodyComponent,
        TabHeaderComponent,
        TitleBarComponent,
    ],
})
export default class AppModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: AppModule,
            providers: PROVIDERS,
        }
    }
}

export { AppRootComponent as bootstrap }
export * from './api'
