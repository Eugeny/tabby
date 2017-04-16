import { NgModule, ModuleWithProviders } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule } from '@angular/forms'
import { ToasterModule } from 'angular2-toaster'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar'

import { AppService } from './services/app'
import { ConfigService } from './services/config'
import { ElectronService } from './services/electron'
import { HostAppService } from './services/hostApp'
import { LogService } from './services/log'
import { HotkeysService, AppHotkeyProvider } from './services/hotkeys'
import { NotifyService } from './services/notify'
import { PluginsService } from './services/plugins'
import { QuitterService } from './services/quitter'
import { DockingService } from './services/docking'
import { TabRecoveryService } from './services/tabRecovery'
import { ThemesService } from './services/themes'

import { AppRootComponent } from './components/appRoot'
import { TabBodyComponent } from './components/tabBody.component'
import { StartPageComponent } from './components/startPage'
import { TabHeaderComponent } from './components/tabHeader'
import { TitleBarComponent } from './components/titleBar'

import { HotkeyProvider } from './api/hotkeyProvider'
import { Theme } from './api/theme'

import { StandardTheme } from './theme'

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
