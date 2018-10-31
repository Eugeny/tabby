import * as fs from 'mz/fs'

import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import TerminusCorePlugin from 'terminus-core'
import { HostAppService } from 'terminus-core'

import { ToolbarButtonProvider, TabRecoveryProvider, ConfigProvider, HotkeysService, HotkeyProvider, AppService, ConfigService } from 'terminus-core'
import { SettingsTabProvider } from 'terminus-settings'

import { AppearanceSettingsTabComponent } from './components/appearanceSettingsTab.component'
import { ShellSettingsTabComponent } from './components/shellSettingsTab.component'
import { TerminalTabComponent } from './components/terminalTab.component'
import { TerminalSettingsTabComponent } from './components/terminalSettingsTab.component'
import { ColorPickerComponent } from './components/colorPicker.component'

import { SessionsService, BaseSession } from './services/sessions.service'
import { TerminalFrontendService } from './services/terminalFrontend.service'
import { TerminalService } from './services/terminal.service'

import { ScreenPersistenceProvider } from './persistence/screen'
import { TMuxPersistenceProvider } from './persistence/tmux'
import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'
import { SessionPersistenceProvider, TerminalColorSchemeProvider, TerminalDecorator, ShellProvider } from './api'
import { TerminalSettingsTabProvider, AppearanceSettingsTabProvider, ShellSettingsTabProvider } from './settings'
import { PathDropDecorator } from './pathDrop'
import { TerminalConfigProvider } from './config'
import { TerminalHotkeyProvider } from './hotkeys'
import { HyperColorSchemes } from './colorSchemes'

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

import { hterm } from './hterm'

@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        ToastrModule,
        TerminusCorePlugin,
    ],
    providers: [
        SessionsService,
        TerminalFrontendService,
        TerminalService,

        { provide: SettingsTabProvider, useClass: AppearanceSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: ShellSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: TerminalSettingsTabProvider, multi: true },

        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        { provide: ConfigProvider, useClass: TerminalConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: TerminalHotkeyProvider, multi: true },
        { provide: TerminalColorSchemeProvider, useClass: HyperColorSchemes, multi: true },
        { provide: TerminalDecorator, useClass: PathDropDecorator, multi: true },

        { provide: SessionPersistenceProvider, useClass: ScreenPersistenceProvider, multi: true },
        { provide: SessionPersistenceProvider, useClass: TMuxPersistenceProvider, multi: true },

        { provide: ShellProvider, useClass: WindowsDefaultShellProvider, multi: true },
        { provide: ShellProvider, useClass: MacOSDefaultShellProvider, multi: true },
        { provide: ShellProvider, useClass: LinuxDefaultShellProvider, multi: true },
        { provide: ShellProvider, useClass: WindowsStockShellsProvider, multi: true },
        { provide: ShellProvider, useClass: CmderShellProvider, multi: true },
        { provide: ShellProvider, useClass: CustomShellProvider, multi: true },
        { provide: ShellProvider, useClass: Cygwin32ShellProvider, multi: true },
        { provide: ShellProvider, useClass: Cygwin64ShellProvider, multi: true },
        { provide: ShellProvider, useClass: GitBashShellProvider, multi: true },
        { provide: ShellProvider, useClass: POSIXShellsProvider, multi: true },
        { provide: ShellProvider, useClass: PowerShellCoreShellProvider, multi: true },
        { provide: ShellProvider, useClass: WSLShellProvider, multi: true },

        // For WindowsDefaultShellProvider
        PowerShellCoreShellProvider,
        WSLShellProvider,
        WindowsStockShellsProvider
    ],
    entryComponents: [
        TerminalTabComponent,
        AppearanceSettingsTabComponent,
        ShellSettingsTabComponent,
        TerminalSettingsTabComponent,
    ],
    declarations: [
        ColorPickerComponent,
        TerminalTabComponent,
        AppearanceSettingsTabComponent,
        ShellSettingsTabComponent,
        TerminalSettingsTabComponent,
    ],
})
export default class TerminalModule {
    constructor (
        app: AppService,
        config: ConfigService,
        hotkeys: HotkeysService,
        terminal: TerminalService,
        hostApp: HostAppService,
    ) {
        let events = [
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
            let oldHandler = hterm.hterm.Keyboard.prototype[event.htermHandler]
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
            if (hotkey.startsWith('shell.')) {
                let shells = await terminal.shells$.toPromise()
                let shell = shells.find(x => x.id === hotkey.split('.')[1])
                if (shell) {
                    terminal.openTab(shell)
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
                id: '',
                command: command[0],
                args: command.slice(1),
            }, null, true)
            hostApp.bringToFront()
        })
        hostApp.cliPaste$.subscribe(text => {
            if (app.activeTab instanceof TerminalTabComponent && app.activeTab.session) {
                (app.activeTab as TerminalTabComponent).sendInput(text)
                hostApp.bringToFront()
            }
        })
    }
}

export { TerminalService, BaseSession, TerminalTabComponent, TerminalFrontendService }
export * from './api'
