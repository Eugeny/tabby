import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class SSHConfigProvider extends ConfigProvider {
    defaults = {
        ssh: {
            warnOnClose: false,
            winSCPPath: null,
            agentType: 'auto',
            agentPath: null,
            x11Display: null,
            knownHosts: [],
            verifyHostKeys: true,
            sftpConcurrentTransfers: 2,
        },
        hotkeys: {
            'restart-ssh-session': [],
            'launch-winscp': [],
            'open-sftp': [],
        },
    }

    platformDefaults = { }
}
