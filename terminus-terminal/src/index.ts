import * as fs from 'mz/fs'
import slug from 'slug'

import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'

import TerminusCorePlugin, { HostAppService, ToolbarButtonProvider, TabRecoveryProvider, ConfigProvider, HotkeysService, HotkeyProvider, AppService, ConfigService, TabContextMenuItemProvider } from 'terminus-core'
import { SettingsTabProvider } from 'terminus-settings'

import { AppearanceSettingsTabComponent } from './components/appearanceSettingsTab.component'
import { TerminalTabComponent } from './components/terminalTab.component'
import { ShellSettingsTabComponent } from './components/shellSettingsTab.component'
import { TerminalSettingsTabComponent } from './components/terminalSettingsTab.component'
import { ColorPickerComponent } from './components/colorPicker.component'
import { EditProfileModalComponent } from './components/editProfileModal.component'
import { EnvironmentEditorComponent } from './components/environmentEditor.component'
import { SearchPanelComponent } from './components/searchPanel.component'

import { BaseSession } from './services/sessions.service'
import { TerminalFrontendService } from './services/terminalFrontend.service'
import { TerminalService } from './services/terminal.service'
import { DockMenuService } from './services/dockMenu.service'

import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'
import { TerminalDecorator } from './api/decorator'
import { TerminalContextMenuItemProvider } from './api/contextMenuProvider'
import { TerminalColorSchemeProvider } from './api/colorSchemeProvider'
import { ShellProvider } from './api/shellProvider'
import { TerminalSettingsTabProvider, AppearanceSettingsTabProvider, ShellSettingsTabProvider } from './settings'
import { PathDropDecorator } from './pathDrop'
import { TerminalConfigProvider } from './config'
import { TerminalHotkeyProvider } from './hotkeys'
import { HyperColorSchemes } from './colorSchemes'
import { NewTabContextMenu, CopyPasteContextMenu } from './contextMenu'
import { SaveAsProfileContextMenu } from './tabContextMenu'

import { CmderShellProvider } from './shells/cmder'
import { CustomShellProvider } from './shells/custom'
import { Cygwin32ShellProvider } from './shells/cygwin32'
import { Cygwin64ShellProvider } from './shells/cygwin64'
import { GitBashShellProvider } from './shells/gitBash'
import { LinuxDefaultShellProvider } from './shells/linuxDefault'
import { MacOSDefaultShellProvider } from './shells/macDefault'
import { POSIXShellsProvider } from './shells/posix'
import { PowerShellCoreShellProvider } from './shells/powershellCore'
import { WindowsDefaultShellProvider } from './shells/winDefault'
import { WindowsStockShellsProvider } from './shells/windowsStock'
import { WSLShellProvider } from './shells/wsl'

import { hterm } from './frontends/hterm'
import { Frontend } from './frontends/frontend'
import { HTermFrontend } from './frontends/htermFrontend'
import { XTermFrontend, XTermWebGLFrontend } from './frontends/xtermFrontend'

/** @hidden */
@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        ToastrModule,
        TerminusCorePlugin,
    ],
    providers: [
        { provide: SettingsTabProvider, useClass: AppearanceSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: ShellSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: TerminalSettingsTabProvider, multi: true },

        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: ConfigProvider, useClass: TerminalConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: TerminalHotkeyProvider, multi: true },
        { provide: TerminalColorSchemeProvider, useClass: HyperColorSchemes, multi: true },
        { provide: TerminalDecorator, useClass: PathDropDecorator, multi: true },

        { provide: ShellProvider, useClass: WindowsDefaultShellProvider, multi: true },
        { provide: ShellProvider, useClass: MacOSDefaultShellProvider, multi: true },
        { provide: ShellProvider, useClass: LinuxDefaultShellProvider, multi: true },
        { provide: ShellProvider, useClass: WindowsStockShellsProvider, multi: true },
        { provide: ShellProvider, useClass: PowerShellCoreShellProvider, multi: true },
        { provide: ShellProvider, useClass: CmderShellProvider, multi: true },
        { provide: ShellProvider, useClass: CustomShellProvider, multi: true },
        { provide: ShellProvider, useClass: Cygwin32ShellProvider, multi: true },
        { provide: ShellProvider, useClass: Cygwin64ShellProvider, multi: true },
        { provide: ShellProvider, useClass: GitBashShellProvider, multi: true },
        { provide: ShellProvider, useClass: POSIXShellsProvider, multi: true },
        { provide: ShellProvider, useClass: WSLShellProvider, multi: true },

        { provide: TerminalContextMenuItemProvider, useClass: NewTabContextMenu, multi: true },
        { provide: TerminalContextMenuItemProvider, useClass: CopyPasteContextMenu, multi: true },

        { provide: TabContextMenuItemProvider, useClass: SaveAsProfileContextMenu, multi: true },

        // For WindowsDefaultShellProvider
        PowerShellCoreShellProvider,
        WSLShellProvider,
        WindowsStockShellsProvider,
    ],
    entryComponents: [
        TerminalTabComponent,
        AppearanceSettingsTabComponent,
        ShellSettingsTabComponent,
        TerminalSettingsTabComponent,
        EditProfileModalComponent,
    ] as any[],
    declarations: [
        ColorPickerComponent,
        TerminalTabComponent,
        AppearanceSettingsTabComponent,
        ShellSettingsTabComponent,
        TerminalSettingsTabComponent,
        EditProfileModalComponent,
        EnvironmentEditorComponent,
        SearchPanelComponent,
    ] as any[],
    exports: [
        ColorPickerComponent,
        EnvironmentEditorComponent,
    ],
})
export default class TerminalModule { // eslint-disable-line @typescript-eslint/no-extraneous-class
    constructor (
        app: AppService,
        config: ConfigService,
        hotkeys: HotkeysService,
        terminal: TerminalService,
        hostApp: HostAppService,
        dockMenu: DockMenuService,
    ) {
        const events = [
            {
                name: 'keydown',
                htermHandler: 'onKeyDown_',
            },
            {
                name: 'keyup',
                htermHandler: 'onKeyUp_',
            },
        ]
        events.forEach((event) => {
            const oldHandler = hterm.hterm.Keyboard.prototype[event.htermHandler]
            hterm.hterm.Keyboard.prototype[event.htermHandler] = function (nativeEvent) {
                hotkeys.pushKeystroke(event.name, nativeEvent)
                if (hotkeys.getCurrentPartiallyMatchedHotkeys().length === 0) {
                    oldHandler.bind(this)(nativeEvent)
                } else {
                    nativeEvent.stopPropagation()
                    nativeEvent.preventDefault()
                }
                hotkeys.processKeystrokes()
                hotkeys.emitKeyEvent(nativeEvent)
            }
        })
        if (config.store.terminal.autoOpen) {
            app.ready$.subscribe(() => {
                terminal.openTab()
            })
        }

        hotkeys.matchedHotkey.subscribe(async (hotkey) => {
            if (hotkey === 'new-tab') {
                terminal.openTab()
            }
            if (hotkey === 'new-window') {
                hostApp.newWindow()
            }
            if (hotkey.startsWith('profile.')) {
                const profiles = await terminal.getProfiles()
                const profile = profiles.find(x => slug(x.name).toLowerCase() === hotkey.split('.')[1])
                if (profile) {
                    terminal.openTabWithOptions(profile.sessionOptions)
                }
            }
        })

        hostApp.cliOpenDirectory$.subscribe(async directory => {
            if (await fs.exists(directory)) {
                if ((await fs.stat(directory)).isDirectory()) {
                    terminal.openTab(null, directory)
                    hostApp.bringToFront()
                }
            }
        })

        hostApp.cliRunCommand$.subscribe(async command => {
            terminal.openTab({
                name: '',
                sessionOptions: {
                    command: command[0],
                    args: command.slice(1),
                },
            }, null, true)
            hostApp.bringToFront()
        })

        hostApp.cliPaste$.subscribe(text => {
            if (app.activeTab instanceof TerminalTabComponent && app.activeTab.session) {
                app.activeTab.sendInput(text)
                hostApp.bringToFront()
            }
        })

        hostApp.cliOpenProfile$.subscribe(async profileName => {
            const profile = config.store.terminal.profiles.find(x => x.name === profileName)
            if (!profile) {
                console.error('Requested profile', profileName, 'not found')
                return
            }
            terminal.openTabWithOptions(profile.sessionOptions)
            hostApp.bringToFront()
        })

        dockMenu.update()
    }
}

export { TerminalService, BaseSession, TerminalTabComponent, TerminalFrontendService, TerminalDecorator, TerminalContextMenuItemProvider, TerminalColorSchemeProvider, ShellProvider }
export { Frontend, XTermFrontend, XTermWebGLFrontend, HTermFrontend }
export { BaseTerminalTabComponent } from './api/baseTerminalTab.component'
export * from './api/interfaces'

// Deprecations
export { TerminalColorScheme as ITerminalColorScheme, Shell as IShell } from './api/interfaces'
