import { ConfigProvider } from 'terminus-core'

/** @hidden */
export class SSHConfigProvider extends ConfigProvider {
    defaults = {
        ssh: {
            connections: [],
            recentConnections: [],
            warnOnClose: false,
        },
        hotkeys: {
            ssh: [
                'Alt-S',
            ],
        },
    }

    platformDefaults = { }
}
