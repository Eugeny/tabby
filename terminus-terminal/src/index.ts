import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import { HostAppService, Platform, ToolbarButtonProvider, TabRecoveryProvider, ConfigProvider, HotkeysService } from 'terminus-core'
import { SettingsTabProvider } from 'terminus-settings'

import { TerminalTabComponent } from './components/terminalTab'
import { SettingsComponent } from './components/settings'
import { ColorPickerComponent } from './components/colorPicker'
import { SessionsService } from './services/sessions'
import { ScreenPersistenceProvider } from './persistenceProviders'
import { ButtonProvider } from './buttonProvider'
import { RecoveryProvider } from './recoveryProvider'
import { SessionPersistenceProvider, TerminalColorSchemeProvider } from './api'
import { TerminalSettingsProvider } from './settings'
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
                if (hostApp.platform == Platform.Windows) {
                  return null
                } else {
                  return screen
                }
            },
            deps: [HostAppService, ScreenPersistenceProvider],
        },
        { provide: SettingsTabProvider, useClass: TerminalSettingsProvider, multi: true },
        { provide: ConfigProvider, useClass: TerminalConfigProvider, multi: true },
        { provide: TerminalColorSchemeProvider, useClass: HyperColorSchemes, multi: true },
    ],
    entryComponents: [
        TerminalTabComponent,
        SettingsComponent,
    ],
    declarations: [
        ColorPickerComponent,
        TerminalTabComponent,
        SettingsComponent,
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
                if (hotkeys.getCurrentPartiallyMatchedHotkeys().length == 0) {
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
