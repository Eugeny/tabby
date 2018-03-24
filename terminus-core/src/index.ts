import { NgModule, ModuleWithProviders } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar'

import { AppService } from './services/app.service'
import { ConfigService } from './services/config.service'
import { ElectronService } from './services/electron.service'
import { HostAppService } from './services/hostApp.service'
import { LogService } from './services/log.service'
import { HotkeysService, AppHotkeyProvider } from './services/hotkeys.service'
import { DockingService } from './services/docking.service'
import { TabRecoveryService } from './services/tabRecovery.service'
import { ThemesService } from './services/themes.service'
import { TouchbarService } from './services/touchbar.service'
import { UpdaterService } from './services/updater.service'

import { AppRootComponent } from './components/appRoot.component'
import { TabBodyComponent } from './components/tabBody.component'
import { SafeModeModalComponent } from './components/safeModeModal.component'
import { StartPageComponent } from './components/startPage.component'
import { TabHeaderComponent } from './components/tabHeader.component'
import { TitleBarComponent } from './components/titleBar.component'
import { WindowControlsComponent } from './components/windowControls.component'
import { RenameTabModalComponent } from './components/renameTabModal.component'

import { HotkeyProvider } from './api/hotkeyProvider'
import { ConfigProvider } from './api/configProvider'
import { Theme } from './api/theme'

import { StandardTheme, StandardCompactTheme } from './theme'
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
    TabRecoveryService,
    ThemesService,
    TouchbarService,
    UpdaterService,
    { provide: HotkeyProvider, useClass: AppHotkeyProvider, multi: true },
    { provide: Theme, useClass: StandardTheme, multi: true },
    { provide: Theme, useClass: StandardCompactTheme, multi: true },
    { provide: ConfigProvider, useClass: CoreConfigProvider, multi: true },
]

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        NgbModule.forRoot(),
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
        WindowControlsComponent,
        RenameTabModalComponent,
        SafeModeModalComponent,
    ],
    entryComponents: [
        RenameTabModalComponent,
        SafeModeModalComponent,
    ]
})
export default class AppModule {
    static forRoot (): ModuleWithProviders {
        return {
            ngModule: AppModule,
            providers: PROVIDERS,
        }
    }
}

export { AppRootComponent as bootstrap }
export * from './api'
