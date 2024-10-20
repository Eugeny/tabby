import { NgModule, ModuleWithProviders, LOCALE_ID } from '@angular/core'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { NgxFilesizeModule } from 'ngx-filesize'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { TranslateModule, TranslateCompiler, TranslateService, MissingTranslationHandler } from '@ngx-translate/core'
import { TranslateMessageFormatCompiler, MESSAGE_FORMAT_CONFIG } from 'ngx-translate-messageformat-compiler'

import '@angular/localize/init'

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

import { Theme, CLIHandler, TabContextMenuItemProvider, TabRecoveryProvider, HotkeyProvider, ConfigProvider, PlatformService, FileProvider, ProfilesService, ProfileProvider, QuickConnectProfileProvider, SelectorOption, Profile, SelectorService, CommandProvider, PartialProfileGroup, ProfileGroup } from './api'

import { AppService } from './services/app.service'
import { ConfigService } from './services/config.service'
import { VaultFileProvider } from './services/vault.service'
import { HotkeysService } from './services/hotkeys.service'
import { CustomMissingTranslationHandler, LocaleService } from './services/locale.service'
import { CommandService } from './services/commands.service'

import { NewTheme } from './theme'
import { CoreConfigProvider } from './config'
import { AppHotkeyProvider } from './hotkeys'
import { TaskCompletionContextMenu, CommonOptionsContextMenu, TabManagementContextMenu, ProfilesContextMenu } from './tabContextMenu'
import { LastCLIHandler, ProfileCLIHandler } from './cli'
import { SplitLayoutProfilesService } from './profiles'
import { CoreCommandProvider } from './commands'

export function TranslateMessageFormatCompilerFactory (): TranslateMessageFormatCompiler {
    return new TranslateMessageFormatCompiler()
}

const PROVIDERS = [
    { provide: HotkeyProvider, useClass: AppHotkeyProvider, multi: true },
    { provide: Theme, useClass: NewTheme, multi: true },
    { provide: ConfigProvider, useClass: CoreConfigProvider, multi: true },
    { provide: TabContextMenuItemProvider, useClass: CommonOptionsContextMenu, multi: true },
    { provide: TabContextMenuItemProvider, useClass: TabManagementContextMenu, multi: true },
    { provide: TabContextMenuItemProvider, useClass: TaskCompletionContextMenu, multi: true },
    { provide: TabContextMenuItemProvider, useClass: ProfilesContextMenu, multi: true },
    { provide: TabRecoveryProvider, useExisting: SplitTabRecoveryProvider, multi: true },
    { provide: CLIHandler, useClass: ProfileCLIHandler, multi: true },
    { provide: CLIHandler, useClass: LastCLIHandler, multi: true },
    { provide: FileProvider, useClass: VaultFileProvider, multi: true },
    { provide: ProfileProvider, useExisting: SplitLayoutProfilesService, multi: true },
    { provide: CommandProvider, useExisting: CoreCommandProvider, multi: true },
    {
        provide: LOCALE_ID,
        deps: [LocaleService],
        useFactory: locale => locale.getLocale(),
    },
    {
        provide: MESSAGE_FORMAT_CONFIG,
        useValue: LocaleService.allLanguages.map(x => x.code),
    },
]

/** @hidden */
@NgModule({
    imports: [
        BrowserAnimationsModule,
        CommonModule,
        FormsModule,
        NgbModule,
        NgxFilesizeModule,
        DragDropModule,
        TranslateModule.forRoot({
            defaultLanguage: 'en',
            compiler: {
                provide: TranslateCompiler,
                useFactory: TranslateMessageFormatCompilerFactory,
            },
            missingTranslationHandler: {
                provide: MissingTranslationHandler,
                useClass: CustomMissingTranslationHandler,
            },
        }),
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
    exports: [
        AppRootComponent,
        CheckboxComponent,
        ToggleComponent,
        PromptModalComponent,
        AutofocusDirective,
        DropZoneDirective,
        FastHtmlBindDirective,
        AlwaysVisibleTypeaheadDirective,
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
        commands: CommandService,
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

        hotkeys.hotkey$.subscribe(async hotkey => {
            if (hotkey.startsWith('profile.')) {
                const id = hotkey.substring(hotkey.indexOf('.') + 1)
                const profiles = await profilesService.getProfiles()
                const profile = profiles.find(x => ProfilesService.getProfileHotkeyName(x) === id)
                if (profile) {
                    profilesService.openNewTabForProfile(profile)
                }
            } else if (hotkey.startsWith('profile-selectors.')) {
                const id = hotkey.substring(hotkey.indexOf('.') + 1)
                const provider = profilesService.getProviders().find(x => x.id === id)
                if (!provider) {
                    return
                }
                this.showSelector(provider).catch(() => null)
            } else if (hotkey.startsWith('group-selectors.')) {
                const id = hotkey.substring(hotkey.indexOf('.') + 1)
                const groups = await this.profilesService.getProfileGroups({ includeProfiles: true })
                const group = groups.find(x => x.id === id)
                if (!group) {
                    return
                }
                this.showGroupSelector(group).catch(() => null)
            } else if (hotkey === 'command-selector') {
                commands.showSelector().catch(() => null)
            } else if (hotkey === 'profile-selector') {
                commands.run('core:profile-selector', {})
            }
        })
    }

    async showSelector (provider: ProfileProvider<Profile>): Promise<void> {
        if (this.selector.active) {
            return
        }

        let profiles = await this.profilesService.getProfiles()

        profiles = profiles.filter(x => !x.isTemplate && x.type === provider.id)

        const options: SelectorOption<void>[] = profiles.map(p => ({
            ...this.profilesService.selectorOptionForProfile(p),
            callback: () => this.profilesService.openNewTabForProfile(p),
        }))

        if (provider instanceof QuickConnectProfileProvider) {
            options.push({
                name: this.translate.instant('Quick connect'),
                freeInputPattern: this.translate.instant('Connect to "%s"...'),
                icon: 'fas fa-arrow-right',
                description: `(${provider.name.toUpperCase()})`,
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

    async showGroupSelector (group: PartialProfileGroup<ProfileGroup>): Promise<void> {
        if (this.selector.active) {
            return
        }

        const profiles = group.profiles ?? []

        const options: SelectorOption<void>[] = profiles.map(p => ({
            ...this.profilesService.selectorOptionForProfile(p),
            callback: () => this.profilesService.openNewTabForProfile(p),
        }))

        await this.selector.show(this.translate.instant('Select profile'), options)
    }

    static forRoot (): ModuleWithProviders<AppModule> {
        return {
            ngModule: AppModule,
            providers: [
                ...PROVIDERS,
            ],
        }
    }
}

export { AppRootComponent as bootstrap }
export * from './api'
export { AppHotkeyProvider }

// Deprecations
export { ToolbarButton as IToolbarButton } from './api'
export { HotkeyDescription as IHotkeyDescription } from './api'
