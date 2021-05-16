import { ConfigProvider, Platform } from 'terminus-core'

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
            customShell: '',
            workingDirectory: '',
            alwaysUseWorkingDirectory: false,
            useConPTY: true,
            showDefaultProfiles: true,
            environment: {},
            profiles: [],
        },
    }

    platformDefaults = {
        [Platform.macOS]: {
            terminal: {
                shell: 'default',
                profile: 'user-default',
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
                profile: 'cmd-clink',
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
                profile: 'user-default',
            },
            hotkeys: {
                'new-tab': [
                    'Ctrl-Shift-T',
                ],
            },
        },
    }
}
