import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class SerialConfigProvider extends ConfigProvider {
    defaults = {
        serial: {
            connections: [],
            options: {
            },
        },
        hotkeys: {
            serial: [
                'Alt-K',
            ],
            'restart-serial-session': [],
        },
    }

    platformDefaults = { }
}
