import { ConfigProvider } from 'terminus-core'

export class SSHConfigProvider extends ConfigProvider {
    defaults = {
        ssh: {
            connections: [],
            options: {
            }
        },
        hotkeys: {
            'ssh': [
                'Alt-S',
            ],
        },
    }

    platformDefaults = { }
}
