import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import { HostAppService, Platform, ToolbarButtonProvider, TabRecoveryProvider, ConfigProvider, HotkeysService } from 'terminus-core'
import { SettingsTabProvider } from 'terminus-settings'

import { TerminalTabComponent } from './components/terminalTab.component'
import { TerminalSettingsTabComponent } from './components/terminalSettingsTab.component'
import { ColorPickerComponent } from './components/colorPicker.component'

import { SessionsService } from './services/sessions.service'

import { ScreenPersistenceProvider } from './persistenceProviders'
import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'
import { SessionPersistenceProvider, TerminalColorSchemeProvider, TerminalDecorator } from './api'
import { TerminalSettingsTabProvider } from './settings'
import { PathDropDecorator } from './pathDrop'
import { TerminalConfigProvider } from './config'
import { HyperColorSchemes } from './colorSchemes'
import { hterm } from './hterm'

@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
    ],
    providers: [
        SessionsService,
        ScreenPersistenceProvider,
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: RecoveryProvider, multi: true },
        {
            provide: SessionPersistenceProvider,
            useFactory: (hostApp: HostAppService, screen: ScreenPersistenceProvider) => {
                if (hostApp.platform === Platform.Windows) {
                    return null
                } else {
                    return screen
                }
            },
            deps: [HostAppService, ScreenPersistenceProvider],
        },
        { provide: SettingsTabProvider, useClass: TerminalSettingsTabProvider, multi: true },
        { provide: ConfigProvider, useClass: TerminalConfigProvider, multi: true },
        { provide: TerminalColorSchemeProvider, useClass: HyperColorSchemes, multi: true },
        { provide: TerminalDecorator, useClass: PathDropDecorator, multi: true },
    ],
    entryComponents: [
        TerminalTabComponent,
        TerminalSettingsTabComponent,
    ],
    declarations: [
        ColorPickerComponent,
        TerminalTabComponent,
        TerminalSettingsTabComponent,
    ],
})
export default class TerminalModule {
    constructor (hotkeys: HotkeysService) {
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
    }
}

export * from './api'
