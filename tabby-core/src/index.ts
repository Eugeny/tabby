import { NgModule, ModuleWithProviders } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { PerfectScrollbarModule, PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar'
import { NgxFilesizeModule } from 'ngx-filesize'
import { SortablejsModule } from 'ngx-sortablejs'
import { DragDropModule } from '@angular/cdk/drag-drop'

import { AppRootComponent } from './components/appRoot.component'
import { CheckboxComponent } from './components/checkbox.component'
import { TabBodyComponent } from './components/tabBody.component'
import { PromptModalComponent } from './components/promptModal.component'
import { SafeModeModalComponent } from './components/safeModeModal.component'
import { StartPageComponent } from './components/startPage.component'
import { TabHeaderComponent } from './components/tabHeader.component'
import { TitleBarComponent } from './components/titleBar.component'
import { ToggleComponent } from './components/toggle.component'
import { WindowControlsComponent } from './components/windowControls.component'
import { RenameTabModalComponent } from './components/renameTabModal.component'
import { SelectorModalComponent } from './components/selectorModal.component'
import { SplitTabComponent, SplitTabRecoveryProvider } from './components/splitTab.component'
import { SplitTabSpannerComponent } from './components/splitTabSpanner.component'
import { SplitTabDropZoneComponent } from './components/splitTabDropZone.component'
import { UnlockVaultModalComponent } from './components/unlockVaultModal.component'
import { WelcomeTabComponent } from './components/welcomeTab.component'
import { TransfersMenuComponent } from './components/transfersMenu.component'

import { AutofocusDirective } from './directives/autofocus.directive'
import { AlwaysVisibleTypeaheadDirective } from './directives/alwaysVisibleTypeahead.directive'
import { FastHtmlBindDirective } from './directives/fastHtmlBind.directive'
import { DropZoneDirective } from './directives/dropZone.directive'
import { CdkAutoDropGroup } from './directives/cdkAutoDropGroup.directive'

import { Theme, CLIHandler, TabContextMenuItemProvider, TabRecoveryProvider, HotkeyProvider, ConfigProvider, PlatformService, FileProvider, ToolbarButtonProvider, ProfilesService, ProfileProvider } from './api'

import { AppService } from './services/app.service'
import { ConfigService } from './services/config.service'
import { VaultFileProvider } from './services/vault.service'
import { HotkeysService } from './services/hotkeys.service'

import { StandardTheme, StandardCompactTheme, PaperTheme } from './theme'
import { CoreConfigProvider } from './config'
import { AppHotkeyProvider } from './hotkeys'
import { TaskCompletionContextMenu, CommonOptionsContextMenu, TabManagementContextMenu, ProfilesContextMenu } from './tabContextMenu'
import { LastCLIHandler, ProfileCLIHandler } from './cli'
import { ButtonProvider } from './buttonProvider'
import { SplitLayoutProfilesService } from './profiles'

import 'perfect-scrollbar/css/perfect-scrollbar.css'

const PROVIDERS = [
    { provide: HotkeyProvider, useClass: AppHotkeyProvider, multi: true },
    { provide: Theme, useClass: StandardTheme, multi: true },
    { provide: Theme, useClass: StandardCompactTheme, multi: true },
    { provide: Theme, useClass: PaperTheme, multi: true },
    { provide: ConfigProvider, useClass: CoreConfigProvider, multi: true },
    { provide: TabContextMenuItemProvider, useClass: CommonOptionsContextMenu, multi: true },
    { provide: TabContextMenuItemProvider, useClass: TabManagementContextMenu, multi: true },
    { provide: TabContextMenuItemProvider, useClass: TaskCompletionContextMenu, multi: true },
    { provide: TabContextMenuItemProvider, useClass: ProfilesContextMenu, multi: true },
    { provide: TabRecoveryProvider, useExisting: SplitTabRecoveryProvider, multi: true },
    { provide: CLIHandler, useClass: ProfileCLIHandler, multi: true },
    { provide: CLIHandler, useClass: LastCLIHandler, multi: true },
    { provide: PERFECT_SCROLLBAR_CONFIG, useValue: { suppressScrollX: true } },
    { provide: FileProvider, useClass: VaultFileProvider, multi: true },
    { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
    { provide: ProfileProvider, useExisting: SplitLayoutProfilesService, multi: true },
]

/** @hidden */
@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        NgbModule,
        NgxFilesizeModule,
        PerfectScrollbarModule,
        DragDropModule,
        SortablejsModule.forRoot({ animation: 150 }),
    ],
    declarations: [
        AppRootComponent,
        CheckboxComponent,
        PromptModalComponent,
        StartPageComponent,
        TabBodyComponent,
        TabHeaderComponent,
        TitleBarComponent,
        ToggleComponent,
        WindowControlsComponent,
        RenameTabModalComponent,
        SafeModeModalComponent,
        AutofocusDirective,
        FastHtmlBindDirective,
        AlwaysVisibleTypeaheadDirective,
        SelectorModalComponent,
        SplitTabComponent,
        SplitTabSpannerComponent,
        SplitTabDropZoneComponent,
        UnlockVaultModalComponent,
        WelcomeTabComponent,
        TransfersMenuComponent,
        DropZoneDirective,
        CdkAutoDropGroup,
    ],
    entryComponents: [
        PromptModalComponent,
        RenameTabModalComponent,
        SafeModeModalComponent,
        SelectorModalComponent,
        SplitTabComponent,
        UnlockVaultModalComponent,
        WelcomeTabComponent,
    ],
    exports: [
        CheckboxComponent,
        ToggleComponent,
        PromptModalComponent,
        AutofocusDirective,
        DropZoneDirective,
        FastHtmlBindDirective,
        AlwaysVisibleTypeaheadDirective,
        SortablejsModule,
        DragDropModule,
    ],
})
export default class AppModule { // eslint-disable-line @typescript-eslint/no-extraneous-class
    constructor (
        app: AppService,
        config: ConfigService,
        platform: PlatformService,
        hotkeys: HotkeysService,
        profilesService: ProfilesService,
    ) {
        app.ready$.subscribe(() => {
            config.ready$.toPromise().then(() => {
                if (config.store.enableWelcomeTab) {
                    app.openNewTabRaw({ type: WelcomeTabComponent })
                }
            })
        })

        platform.setErrorHandler(err => {
            console.error('Unhandled exception:', err)
        })

        hotkeys.hotkey$.subscribe(async (hotkey) => {
            if (hotkey.startsWith('profile.')) {
                const id = hotkey.split('.')[1]
                const profile = (await profilesService.getProfiles()).find(x => x.id === id)
                if (profile) {
                    profilesService.openNewTabForProfile(profile)
                }
            }
        })
    }

    static forRoot (): ModuleWithProviders<AppModule> {
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
