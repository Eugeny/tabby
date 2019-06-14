import { ConfigProvider } from 'terminus-core'

/** @hidden */
export class SSHConfigProvider extends ConfigProvider {
    defaults = {
        ssh: {
            connections: [],
            options: {
            },
        },
        hotkeys: {
            ssh: [
                'Alt-S',
            ],
        },
    }

    platformDefaults = { }
}
