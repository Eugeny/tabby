import { ConfigProvider } from 'terminus-core'


export class TerminalConfigProvider extends ConfigProvider {
    defaultConfigValues: any = {
        terminal: {
            font: 'monospace',
            fontSize: 14,
            bell: 'off',
            bracketedPaste: true,
            background: 'theme',
            colorScheme: {
                foreground: null,
                background: null,
                colors: null,
            },
        },
        hotkeys: {
            'new-tab': [
                ['Ctrl-A', 'C'],
                ['Ctrl-A', 'Ctrl-C'],
                'Ctrl-Shift-T',
            ]
        },
    }

    configStructure: any = {
        terminal: {
            colorScheme: {},
        },
        hotkeys: {},
    }
}
