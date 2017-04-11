import { NgModule, ModuleWithProviders } from '@angular/core'
console.info((<any>global).require.resolve('@angular/core'))
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule } from '@angular/forms'
import { ToasterModule } from 'angular2-toaster'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

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

import { AppRootComponent } from './components/appRoot'
import { TabBodyComponent } from './components/tabBody'
import { TabHeaderComponent } from './components/tabHeader'
import { TitleBarComponent } from './components/titleBar'

import { HotkeyProvider } from './api/hotkeyProvider'


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
    QuitterService,
    { provide: HotkeyProvider, useClass: AppHotkeyProvider, multi: true },
]


@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ToasterModule,
        NgbModule,
    ],
    providers: PROVIDERS,
    declarations: [
        AppRootComponent,
        TabBodyComponent,
        TabHeaderComponent,
        TitleBarComponent,
    ],
})
export default class AppModule {
}

export class AppRootModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: AppModule,
            providers: PROVIDERS,
        }
    }
}

export { AppRootComponent }
export * from './api'
