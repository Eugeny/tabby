import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'

import TabbyCorePlugin, { HostAppService, ToolbarButtonProvider, TabRecoveryProvider, ConfigProvider, HotkeysService, HotkeyProvider, TabContextMenuItemProvider, CLIHandler, ConfigService, ProfileProvider } from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'
import TabbyElectronPlugin from 'tabby-electron'
import { SettingsTabProvider } from 'tabby-settings'

import { TerminalTabComponent } from './components/terminalTab.component'
import { ShellSettingsTabComponent } from './components/shellSettingsTab.component'
import { EnvironmentEditorComponent } from './components/environmentEditor.component'
import { LocalProfileSettingsComponent } from './components/localProfileSettings.component'
import { CommandLineEditorComponent } from './components/commandLineEditor.component'

import { TerminalService } from './services/terminal.service'
import { DockMenuService } from './services/dockMenu.service'

import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'
import { ShellProvider } from './api'
import { ShellSettingsTabProvider } from './settings'
import { TerminalConfigProvider } from './config'
import { LocalTerminalHotkeyProvider } from './hotkeys'
import { NewTabContextMenu, SaveAsProfileContextMenu } from './tabContextMenu'

import { CmderShellProvider } from './shells/cmder'
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
import { VSDevToolsProvider } from './shells/vs'

import { AutoOpenTabCLIHandler, OpenPathCLIHandler, TerminalCLIHandler } from './cli'
import { LocalProfilesService } from './profiles'

/** @hidden */
@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        ToastrModule,
        TabbyCorePlugin,
        TabbyElectronPlugin,
        TabbyTerminalModule,
    ],
    providers: [
        { provide: SettingsTabProvider, useClass: ShellSettingsTabProvider, multi: true },

        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: ConfigProvider, useClass: TerminalConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: LocalTerminalHotkeyProvider, multi: true },

        { provide: ShellProvider, useClass: WindowsDefaultShellProvider, multi: true },
        { provide: ShellProvider, useClass: MacOSDefaultShellProvider, multi: true },
        { provide: ShellProvider, useClass: LinuxDefaultShellProvider, multi: true },
        { provide: ShellProvider, useClass: WindowsStockShellsProvider, multi: true },
        { provide: ShellProvider, useClass: PowerShellCoreShellProvider, multi: true },
        { provide: ShellProvider, useClass: CmderShellProvider, multi: true },
        { provide: ShellProvider, useClass: Cygwin32ShellProvider, multi: true },
        { provide: ShellProvider, useClass: Cygwin64ShellProvider, multi: true },
        { provide: ShellProvider, useClass: GitBashShellProvider, multi: true },
        { provide: ShellProvider, useClass: POSIXShellsProvider, multi: true },
        { provide: ShellProvider, useClass: WSLShellProvider, multi: true },
        { provide: ShellProvider, useClass: VSDevToolsProvider, multi: true },

        { provide: ProfileProvider, useClass: LocalProfilesService, multi: true },

        { provide: TabContextMenuItemProvider, useClass: NewTabContextMenu, multi: true },
        { provide: TabContextMenuItemProvider, useClass: SaveAsProfileContextMenu, multi: true },

        { provide: CLIHandler, useClass: TerminalCLIHandler, multi: true },
        { provide: CLIHandler, useClass: OpenPathCLIHandler, multi: true },
        { provide: CLIHandler, useClass: AutoOpenTabCLIHandler, multi: true },

        // For WindowsDefaultShellProvider
        PowerShellCoreShellProvider,
        WSLShellProvider,
        WindowsStockShellsProvider,
    ],
    entryComponents: [
        TerminalTabComponent,
        ShellSettingsTabComponent,
        LocalProfileSettingsComponent,
    ],
    declarations: [
        TerminalTabComponent,
        ShellSettingsTabComponent,
        EnvironmentEditorComponent,
        CommandLineEditorComponent,
        LocalProfileSettingsComponent,
    ],
    exports: [
        TerminalTabComponent,
        EnvironmentEditorComponent,
        CommandLineEditorComponent,
    ],
})
export default class LocalTerminalModule { // eslint-disable-line @typescript-eslint/no-extraneous-class
    private constructor (
        hotkeys: HotkeysService,
        terminal: TerminalService,
        hostApp: HostAppService,
        dockMenu: DockMenuService,
        config: ConfigService,
    ) {
        hotkeys.hotkey$.subscribe(async (hotkey) => {
            if (hotkey === 'new-tab') {
                terminal.openTab()
            }
            if (hotkey === 'new-window') {
                hostApp.newWindow()
            }
        })

        config.ready$.toPromise().then(() => {
            dockMenu.update()
        })
    }
}

export { TerminalTabComponent }
export { TerminalService, ShellProvider }
export * from './api'
