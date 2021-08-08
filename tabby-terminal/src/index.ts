import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'

import TabbyCorePlugin, { ConfigProvider, HotkeyProvider, TabContextMenuItemProvider, CLIHandler } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'

import { AppearanceSettingsTabComponent } from './components/appearanceSettingsTab.component'
import { ColorSchemeSettingsTabComponent } from './components/colorSchemeSettingsTab.component'
import { TerminalSettingsTabComponent } from './components/terminalSettingsTab.component'
import { ColorPickerComponent } from './components/colorPicker.component'
import { ColorSchemePreviewComponent } from './components/colorSchemePreview.component'
import { SearchPanelComponent } from './components/searchPanel.component'
import { StreamProcessingSettingsComponent } from './components/streamProcessingSettings.component'
import { LoginScriptsSettingsComponent } from './components/loginScriptsSettings.component'

import { TerminalFrontendService } from './services/terminalFrontend.service'

import { TerminalDecorator } from './api/decorator'
import { TerminalContextMenuItemProvider } from './api/contextMenuProvider'
import { TerminalColorSchemeProvider } from './api/colorSchemeProvider'
import { TerminalSettingsTabProvider, AppearanceSettingsTabProvider, ColorSchemeSettingsTabProvider } from './settings'
import { DebugDecorator } from './features/debug'
import { PathDropDecorator } from './features/pathDrop'
import { ZModemDecorator } from './features/zmodem'
import { TerminalConfigProvider } from './config'
import { TerminalHotkeyProvider } from './hotkeys'
import { CopyPasteContextMenu, MiscContextMenu, LegacyContextMenu } from './tabContextMenu'

import { Frontend } from './frontends/frontend'
import { XTermFrontend, XTermWebGLFrontend } from './frontends/xtermFrontend'
import { TerminalCLIHandler } from './cli'

/** @hidden */
@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        ToastrModule,
        TabbyCorePlugin,
    ],
    providers: [
        { provide: SettingsTabProvider, useClass: AppearanceSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: ColorSchemeSettingsTabProvider, multi: true },
        { provide: SettingsTabProvider, useClass: TerminalSettingsTabProvider, multi: true },

        { provide: ConfigProvider, useClass: TerminalConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: TerminalHotkeyProvider, multi: true },
        { provide: TerminalDecorator, useClass: PathDropDecorator, multi: true },
        { provide: TerminalDecorator, useClass: ZModemDecorator, multi: true },
        { provide: TerminalDecorator, useClass: DebugDecorator, multi: true },

        { provide: TabContextMenuItemProvider, useClass: CopyPasteContextMenu, multi: true },
        { provide: TabContextMenuItemProvider, useClass: MiscContextMenu, multi: true },
        { provide: TabContextMenuItemProvider, useClass: LegacyContextMenu, multi: true },

        { provide: CLIHandler, useClass: TerminalCLIHandler, multi: true },
    ],
    entryComponents: [
        AppearanceSettingsTabComponent,
        ColorSchemeSettingsTabComponent,
        TerminalSettingsTabComponent,
    ],
    declarations: [
        ColorPickerComponent,
        ColorSchemePreviewComponent,
        AppearanceSettingsTabComponent,
        ColorSchemeSettingsTabComponent,
        TerminalSettingsTabComponent,
        SearchPanelComponent,
        StreamProcessingSettingsComponent,
        LoginScriptsSettingsComponent,
    ],
    exports: [
        ColorPickerComponent,
        SearchPanelComponent,
        StreamProcessingSettingsComponent,
        LoginScriptsSettingsComponent,
    ],
})
export default class TerminalModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class

export { TerminalFrontendService, TerminalDecorator, TerminalContextMenuItemProvider, TerminalColorSchemeProvider }
export { Frontend, XTermFrontend, XTermWebGLFrontend }
export { BaseTerminalTabComponent } from './api/baseTerminalTab.component'
export * from './api/interfaces'
export * from './api/streamProcessing'
export * from './api/loginScriptProcessing'
export * from './api/osc1337Processing'
export * from './session'
export { LoginScriptsSettingsComponent, StreamProcessingSettingsComponent }
