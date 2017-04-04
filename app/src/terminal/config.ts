import { ConfigProvider } from 'api'


export class TerminalConfigProvider extends ConfigProvider {
    defaultConfigValues: any = {
        terminal: {
            font: 'monospace',
            fontSize: 14,
            bell: 'off',
            bracketedPaste: true,
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
        terminal: {},
        hotkeys: {},
    }
}
