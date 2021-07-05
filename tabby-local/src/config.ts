import { ConfigProvider, Platform } from 'tabby-core'

/** @hidden */
export class TerminalConfigProvider extends ConfigProvider {
    defaults = {
        hotkeys: {
            'copy-current-path': [],
            profile: {
                __nonStructural: true,
            },
        },
        terminal: {
            autoOpen: false,
            useConPTY: true,
            showBuiltinProfiles: true,
            environment: {},
            profiles: [],
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
