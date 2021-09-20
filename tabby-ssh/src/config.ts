import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class SSHConfigProvider extends ConfigProvider {
    defaults = {
        ssh: {
            warnOnClose: false,
            winSCPPath: null,
            agentType: 'auto',
            agentPath: null,
        },
        hotkeys: {
            'restart-ssh-session': [],
            'launch-winscp': [],
        },
    }

    platformDefaults = { }
}
