import { ConfigProvider, Platform } from 'tabby-core'

/** @hidden */
export class TerminalConfigProvider extends ConfigProvider {
    defaults = {
        terminal: {
            autoOpen: false,
            useConPTY: true,
            environment: {},
            setComSpec: false,
        },
    }

    platformDefaults = {
        [Platform.macOS]: {
            terminal: {
                profile: 'local:default',
            },
            hotkeys: {
                'new-tab': [
                    '⌘-T',
                ],
            },
        },
        [Platform.Windows]: {
            terminal: {
                profile: 'local:cmd-clink',
            },
            hotkeys: {
                'new-tab': [
                    'Ctrl-Shift-T',
                ],
            },
        },
        [Platform.Linux]: {
            terminal: {
                profile: 'local:default',
            },
            hotkeys: {
                'new-tab': [
                    'Ctrl-Shift-T',
                ],
            },
        },
    }
}
