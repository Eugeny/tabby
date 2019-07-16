import { NgModule, ModuleWithProviders } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { PerfectScrollbarModule, PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar'
import { DndModule } from 'ng2-dnd'

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
import { SplitTabComponent, SplitTabRecoveryProvider } from './components/splitTab.component'
import { SplitTabSpannerComponent } from './components/splitTabSpanner.component'
import { WelcomeTabComponent } from './components/welcomeTab.component'

import { AutofocusDirective } from './directives/autofocus.directive'

import { HotkeyProvider } from './api/hotkeyProvider'
import { ConfigProvider } from './api/configProvider'
import { Theme } from './api/theme'
import { TabContextMenuItemProvider } from './api/tabContextMenuProvider'
import { TabRecoveryProvider } from './api/tabRecovery'

import { AppService } from './services/app.service'
import { ConfigService } from './services/config.service'

import { StandardTheme, StandardCompactTheme, PaperTheme } from './theme'
import { CoreConfigProvider } from './config'
import { AppHotkeyProvider } from './hotkeys'
import { TaskCompletionContextMenu, CommonOptionsContextMenu, CloseContextMenu } from './tabContextMenu'

import 'perfect-scrollbar/css/perfect-scrollbar.css'
import 'ng2-dnd/bundles/style.css'

// PerfectScrollbar fix
import { fromEvent } from 'rxjs/internal/observable/fromEvent'
import { merge } from 'rxjs/internal/observable/merge'
require('rxjs').fromEvent = fromEvent
require('rxjs').merge = merge

const PROVIDERS = [
    { provide: HotkeyProvider, useClass: AppHotkeyProvider, multi: true },
    { provide: Theme, useClass: StandardTheme, multi: true },
    { provide: Theme, useClass: StandardCompactTheme, multi: true },
    { provide: Theme, useClass: PaperTheme, multi: true },
    { provide: ConfigProvider, useClass: CoreConfigProvider, multi: true },
    { provide: TabContextMenuItemProvider, useClass: CommonOptionsContextMenu, multi: true },
    { provide: TabContextMenuItemProvider, useClass: CloseContextMenu, multi: true },
    { provide: TabContextMenuItemProvider, useClass: TaskCompletionContextMenu, multi: true },
    { provide: TabRecoveryProvider, useClass: SplitTabRecoveryProvider, multi: true },
    { provide: PERFECT_SCROLLBAR_CONFIG, useValue: { suppressScrollX: true } },
]

/** @hidden */
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
        AppRootComponent as any,
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
        SplitTabComponent,
        SplitTabSpannerComponent,
        WelcomeTabComponent,
    ],
    entryComponents: [
        RenameTabModalComponent,
        SafeModeModalComponent,
        SplitTabComponent,
        WelcomeTabComponent,
    ],
    exports: [
        CheckboxComponent,
        ToggleComponent,
        AutofocusDirective,
    ],
})
export default class AppModule { // eslint-disable-line @typescript-eslint/no-extraneous-class
    constructor (app: AppService, config: ConfigService) {
        app.ready$.subscribe(() => {
            if (config.store.enableWelcomeTab) {
                app.openNewTabRaw(WelcomeTabComponent)
            }
        })
    }

    static forRoot (): ModuleWithProviders {
        return {
            ngModule: AppModule,
            providers: PROVIDERS,
        }
    }
}

export { AppRootComponent as bootstrap }
export * from './api'

// Deprecations
export { ToolbarButton as IToolbarButton } from './api'
export { HotkeyDescription as IHotkeyDescription } from './api'
