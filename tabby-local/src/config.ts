import { ConfigProvider, Platform } from 'tabby-core'

/** @hidden */
export class TerminalConfigProvider extends ConfigProvider {
    defaults = {
        hotkeys: {
            'copy-current-path': [],
            shell: {
                __nonStructural: true,
            },
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
                shell: 'default',
                profile: 'local:user-default',
            },
            hotkeys: {
                'new-tab': [
                    '⌘-T',
                ],
            },
        },
        [Platform.Windows]: {
            terminal: {
                shell: 'clink',
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
                shell: 'default',
                profile: 'local:user-default',
            },
            hotkeys: {
                'new-tab': [
                    'Ctrl-Shift-T',
                ],
            },
        },
    }
}
