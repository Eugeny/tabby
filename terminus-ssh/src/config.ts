import { ConfigProvider } from 'terminus-core'

/** @hidden */
export class SSHConfigProvider extends ConfigProvider {
    defaults = {
        ssh: {
            connections: [],
            recentConnections: [],
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
