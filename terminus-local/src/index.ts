import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'

import TerminusCorePlugin, { HostAppService, ToolbarButtonProvider, TabRecoveryProvider, ConfigProvider, HotkeysService, HotkeyProvider, TabContextMenuItemProvider, CLIHandler, ConfigService } from 'terminus-core'
import TerminusTerminalModule from 'terminus-terminal'
import { SettingsTabProvider } from 'terminus-settings'

import { TerminalTabComponent } from './components/terminalTab.component'
import { ShellSettingsTabComponent } from './components/shellSettingsTab.component'
import { EditProfileModalComponent } from './components/editProfileModal.component'
import { EnvironmentEditorComponent } from './components/environmentEditor.component'

import { TerminalService } from './services/terminal.service'
import { DockMenuService } from './services/dockMenu.service'

import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'
import { ShellProvider } from './api'
import { ShellSettingsTabProvider } from './settings'
import { TerminalConfigProvider } from './config'
import { TerminalHotkeyProvider } from './hotkeys'
import { NewTabContextMenu, SaveAsProfileContextMenu } from './tabContextMenu'

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

import { AutoOpenTabCLIHandler, OpenPathCLIHandler, TerminalCLIHandler } from './cli'

/** @hidden */
@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        ToastrModule,
        TerminusCorePlugin,
        TerminusTerminalModule,
    ],
    providers: [
        { provide: SettingsTabProvider, useClass: ShellSettingsTabProvider, multi: true },

        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: ConfigProvider, useClass: TerminalConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: TerminalHotkeyProvider, multi: true },

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
        EditProfileModalComponent,
    ] as any[],
    declarations: [
        TerminalTabComponent,
        ShellSettingsTabComponent,
        EditProfileModalComponent,
        EnvironmentEditorComponent,
    ] as any[],
    exports: [
        TerminalTabComponent,
        EnvironmentEditorComponent,
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
        hotkeys.matchedHotkey.subscribe(async (hotkey) => {
            if (hotkey === 'new-tab') {
                terminal.openTab()
            }
            if (hotkey === 'new-window') {
                hostApp.newWindow()
            }
            if (hotkey.startsWith('profile.')) {
                const profile = await terminal.getProfileByID(hotkey.split('.')[1])
                if (profile) {
                    terminal.openTabWithOptions(profile.sessionOptions)
                }
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
