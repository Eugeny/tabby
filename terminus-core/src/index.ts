import { NgModule, ModuleWithProviders } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { PerfectScrollbarModule, PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar'
import { DndModule } from 'ng2-dnd'

import { AppService } from './services/app.service'
import { ConfigService } from './services/config.service'
import { ElectronService } from './services/electron.service'
import { HostAppService } from './services/hostApp.service'
import { LogService } from './services/log.service'
import { HomeBaseService } from './services/homeBase.service'
import { HotkeysService, AppHotkeyProvider } from './services/hotkeys.service'
import { DockingService } from './services/docking.service'
import { ShellIntegrationService } from './services/shellIntegration.service'
import { TabRecoveryService } from './services/tabRecovery.service'
import { ThemesService } from './services/themes.service'
import { TouchbarService } from './services/touchbar.service'
import { UpdaterService } from './services/updater.service'

import { AppRootComponent } from './components/appRoot.component'
import { CheckboxComponent } from './components/checkbox.component'
import { TabBodyComponent } from './components/tabBody.component'
import { SafeModeModalComponent } from './components/safeModeModal.component'
import { StartPageComponent } from './components/startPage.component'
import { TabHeaderComponent } from './components/tabHeader.component'
import { TitleBarComponent } from './components/titleBar.component'
import { ToggleComponent } from './components/toggle.component'
import { WindowControlsComponent } from './components/windowControls.component'
import { RenameTabModalComponent } from './components/renameTabModal.component'

import { AutofocusDirective } from './directives/autofocus.directive'

import { HotkeyProvider } from './api/hotkeyProvider'
import { ConfigProvider } from './api/configProvider'
import { Theme } from './api/theme'

import { StandardTheme, StandardCompactTheme, PaperTheme } from './theme'
import { CoreConfigProvider } from './config'

import 'perfect-scrollbar/css/perfect-scrollbar.css'
import 'ng2-dnd/bundles/style.css'

const PROVIDERS = [
    AppService,
    ConfigService,
    DockingService,
    ElectronService,
    HomeBaseService,
    HostAppService,
    HotkeysService,
    LogService,
    ShellIntegrationService,
    TabRecoveryService,
    ThemesService,
    TouchbarService,
    UpdaterService,
    { provide: HotkeyProvider, useClass: AppHotkeyProvider, multi: true },
    { provide: Theme, useClass: StandardTheme, multi: true },
    { provide: Theme, useClass: StandardCompactTheme, multi: true },
    { provide: Theme, useClass: PaperTheme, multi: true },
    { provide: ConfigProvider, useClass: CoreConfigProvider, multi: true },
    { provide: PERFECT_SCROLLBAR_CONFIG, useValue: { suppressScrollX: true }}
]

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        NgbModule.forRoot(),
        PerfectScrollbarModule,
        DndModule.forRoot(),
    ],
    declarations: [
        AppRootComponent,
        CheckboxComponent,
        StartPageComponent,
        TabBodyComponent,
        TabHeaderComponent,
        TitleBarComponent,
        ToggleComponent,
        WindowControlsComponent,
        RenameTabModalComponent,
        SafeModeModalComponent,
        AutofocusDirective,
    ],
    entryComponents: [
        RenameTabModalComponent,
        SafeModeModalComponent,
    ],
    exports: [
        CheckboxComponent,
        ToggleComponent,
        AutofocusDirective,
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

// PerfectScrollbar fix
import { fromEvent } from 'rxjs/internal/observable/fromEvent'
import { merge } from 'rxjs/internal/observable/merge'
require('rxjs').fromEvent = fromEvent
require('rxjs').merge = merge

export { AppRootComponent as bootstrap }
export * from './api'
