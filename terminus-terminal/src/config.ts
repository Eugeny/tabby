import { ConfigProvider, Platform } from 'terminus-core'


export class TerminalConfigProvider extends ConfigProvider {
    defaults = {
        terminal: {
            fontSize: 14,
            bell: 'off',
            bracketedPaste: true,
            background: 'theme',
            colorScheme: {
                __nonStructural: true,
                foreground: null,
                background: null,
                cursor: null,
                colors: [],
            },
            customColorSchemes: []
        },
    }

    platformDefaults = {
        [Platform.macOS]: {
            terminal: {
                font: 'Menlo',
                shell: '/bin/zsh',
            },
            hotkeys: {
                'new-tab': [
                    ['Ctrl-A', 'C'],
                    ['Ctrl-A', 'Ctrl-C'],
                    'Cmd-T',
                ]
            },
        },
        [Platform.Windows]: {
            terminal: {
                font: 'Consolas',
                shell: 'cmd.exe',
            },
            hotkeys: {
                'new-tab': [
                    ['Ctrl-A', 'C'],
                    ['Ctrl-A', 'Ctrl-C'],
                    'Ctrl-Shift-T',
                ]
            },
        },
        [Platform.Linux]: {
            terminal: {
                font: 'Liberation Mono',
                shell: '/bin/bash',
            },
            hotkeys: {
                'new-tab': [
                    ['Ctrl-A', 'C'],
                    ['Ctrl-A', 'Ctrl-C'],
                    'Ctrl-Shift-T',
                ]
            },
        },
    }
}
