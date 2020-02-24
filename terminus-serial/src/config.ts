import { ConfigProvider } from 'terminus-core'

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
        },
    }

    platformDefaults = { }
}
