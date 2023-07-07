import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'

import TabbyCorePlugin, { HostAppService, ToolbarButtonProvider, TabRecoveryProvider, ConfigProvider, HotkeysService, HotkeyProvider, TabContextMenuItemProvider, CLIHandler, ProfileProvider } from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'
import { SettingsTabProvider } from 'tabby-settings'

import { TerminalTabComponent } from './components/terminalTab.component'
import { ShellSettingsTabComponent } from './components/shellSettingsTab.component'
import { EnvironmentEditorComponent } from './components/environmentEditor.component'
import { LocalProfileSettingsComponent } from './components/localProfileSettings.component'
import { CommandLineEditorComponent } from './components/commandLineEditor.component'

import { TerminalService } from './services/terminal.service'

import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'
import { ShellSettingsTabProvider } from './settings'
import { TerminalConfigProvider } from './config'
import { LocalTerminalHotkeyProvider } from './hotkeys'
import { NewTabContextMenu } from './tabContextMenu'

import { AutoOpenTabCLIHandler, OpenPathCLIHandler, TerminalCLIHandler } from './cli'
import { LocalProfilesService } from './profiles'

/** @hidden */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        NgbModule,
        ToastrModule,
        TabbyCorePlugin,
        TabbyTerminalModule,
    ],
    providers: [
        { provide: SettingsTabProvider, useClass: ShellSettingsTabProvider, multi: true },

        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: ConfigProvider, useClass: TerminalConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: LocalTerminalHotkeyProvider, multi: true },

        { provide: ProfileProvider, useClass: LocalProfilesService, multi: true },

        { provide: TabContextMenuItemProvider, useClass: NewTabContextMenu, multi: true },

        { provide: CLIHandler, useClass: TerminalCLIHandler, multi: true },
        { provide: CLIHandler, useClass: OpenPathCLIHandler, multi: true },
        { provide: CLIHandler, useClass: AutoOpenTabCLIHandler, multi: true },
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
    ) {
        hotkeys.hotkey$.subscribe(async (hotkey) => {
            if (hotkey === 'new-tab') {
                terminal.openTab()
            }
            if (hotkey === 'new-window') {
                hostApp.newWindow()
            }
        })
    }
}

export { TerminalTabComponent }
export { TerminalService }
export * from './api'
