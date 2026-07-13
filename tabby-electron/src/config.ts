import { ConfigProvider, Platform } from 'tabby-core'

/** @hidden */
export class ElectronConfigProvider extends ConfigProvider {
    platformDefaults = {
        [Platform.macOS]: {
            hotkeys: {
                'new-window': ['⌘-N'],
            },
        },
        [Platform.Windows]: {
            hotkeys: {
                'new-window': ['Ctrl-Shift-N'],
            },
        },
        [Platform.Linux]: {
            hotkeys: {
                'new-window': ['Ctrl-Shift-N'],
            },
        },
    }

    defaults = {}
}
