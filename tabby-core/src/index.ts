import { NgModule, ModuleWithProviders, LOCALE_ID } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { PerfectScrollbarModule, PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar'
import { NgxFilesizeModule } from 'ngx-filesize'
import { SortablejsModule } from 'ngx-sortablejs'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { TranslateModule, TranslateCompiler, TranslateService } from '@ngx-translate/core'
import { TranslateMessageFormatCompiler, MESSAGE_FORMAT_CONFIG } from 'ngx-translate-messageformat-compiler'

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
import { SplitTabPaneLabelComponent } from './components/splitTabPaneLabel.component'
import { UnlockVaultModalComponent } from './components/unlockVaultModal.component'
import { WelcomeTabComponent } from './components/welcomeTab.component'
import { TransfersMenuComponent } from './components/transfersMenu.component'
import { ProfileIconComponent } from './components/profileIcon.component'

import { AutofocusDirective } from './directives/autofocus.directive'
import { AlwaysVisibleTypeaheadDirective } from './directives/alwaysVisibleTypeahead.directive'
import { FastHtmlBindDirective } from './directives/fastHtmlBind.directive'
import { DropZoneDirective } from './directives/dropZone.directive'
import { CdkAutoDropGroup } from './directives/cdkAutoDropGroup.directive'

import { Theme, CLIHandler, TabContextMenuItemProvider, TabRecoveryProvider, HotkeyProvider, ConfigProvider, PlatformService, FileProvider, ToolbarButtonProvider, ProfilesService, ProfileProvider, SelectorOption, Profile, SelectorService } from './api'

import { AppService } from './services/app.service'
import { ConfigService } from './services/config.service'
import { VaultFileProvider } from './services/vault.service'
import { HotkeysService } from './services/hotkeys.service'
import { LocaleService, TranslateServiceWrapper } from './services/locale.service'

import { StandardTheme, StandardCompactTheme, PaperTheme } from './theme'
import { CoreConfigProvider } from './config'
import { AppHotkeyProvider } from './hotkeys'
import { TaskCompletionContextMenu, CommonOptionsContextMenu, TabManagementContextMenu, ProfilesContextMenu } from './tabContextMenu'
import { LastCLIHandler, ProfileCLIHandler } from './cli'
import { ButtonProvider } from './buttonProvider'
import { SplitLayoutProfilesService } from './profiles'

import 'perfect-scrollbar/css/perfect-scrollbar.css'

export function TranslateMessageFormatCompilerFactory (): TranslateMessageFormatCompiler {
    return new TranslateMessageFormatCompiler()
}

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
    {
        provide: LOCALE_ID,
        deps: [LocaleService],
        useFactory: locale => locale.getLocale(),
    },
    {
        provide: MESSAGE_FORMAT_CONFIG,
        useValue: LocaleService.allLanguages.map(x => x.code),
    },
    {
        provide: TranslateService,
        useClass: TranslateServiceWrapper,
    },
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
        TranslateModule,
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
        SplitTabPaneLabelComponent,
        UnlockVaultModalComponent,
        WelcomeTabComponent,
        TransfersMenuComponent,
        DropZoneDirective,
        CdkAutoDropGroup,
        ProfileIconComponent,
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
        TranslateModule,
        CdkAutoDropGroup,
        ProfileIconComponent,
    ],
})
export default class AppModule { // eslint-disable-line @typescript-eslint/no-extraneous-class
    constructor (
        app: AppService,
        config: ConfigService,
        platform: PlatformService,
        hotkeys: HotkeysService,
        public locale: LocaleService,
        private translate: TranslateService,
        private profilesService: ProfilesService,
        private selector: SelectorService,
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
                const id = hotkey.substring(hotkey.indexOf('.') + 1)
                const profiles = await profilesService.getProfiles()
                const profile = profiles.find(x => AppHotkeyProvider.getProfileHotkeyName(x) === id)
                if (profile) {
                    profilesService.openNewTabForProfile(profile)
                }
            }
            if (hotkey.startsWith('profile-selectors.')) {
                const id = hotkey.substring(hotkey.indexOf('.') + 1)
                const provider = profilesService.getProviders().find(x => x.id === id)
                if (!provider) {
                    return
                }
                this.showSelector(provider)
            }
        })
    }

    async showSelector (provider: ProfileProvider<Profile>): Promise<void> {
        let profiles = await this.profilesService.getProfiles()

        profiles = profiles.filter(x => !x.isTemplate && x.type === provider.id)

        const options: SelectorOption<void>[] = profiles.map(p => ({
            ...this.profilesService.selectorOptionForProfile(p),
            callback: () => this.profilesService.openNewTabForProfile(p),
        }))

        if (provider.supportsQuickConnect) {
            options.push({
                name: this.translate.instant('Quick connect'),
                freeInputPattern: this.translate.instant('Connect to "%s"...'),
                icon: 'fas fa-arrow-right',
                callback: query => {
                    const p = provider.quickConnect(query)
                    if (p) {
                        this.profilesService.openNewTabForProfile(p)
                    }
                },
            })
        }

        await this.selector.show(this.translate.instant('Select profile'), options)
    }

    static forRoot (): ModuleWithProviders<AppModule> {
        const translateModule = TranslateModule.forRoot({
            defaultLanguage: 'en',
            compiler: {
                provide: TranslateCompiler,
                useFactory: TranslateMessageFormatCompilerFactory,
            },
        })
        return {
            ngModule: AppModule,
            providers: [
                ...PROVIDERS,
                ...translateModule.providers!.filter(x => x !== TranslateService),
            ],
        }
    }
}

export { AppRootComponent as bootstrap }
export * from './api'

// Deprecations
export { ToolbarButton as IToolbarButton } from './api'
export { HotkeyDescription as IHotkeyDescription } from './api'
