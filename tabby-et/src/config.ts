import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class ETConfigProvider extends ConfigProvider {
    defaults = {
        et: {
            warnOnClose: false,
            defaultEtterminalPath: null,
            debugProtocol: false,
        },
        hotkeys: {
            'restart-et-session': [],
            'et-force-reconnect': [],
        },
    }

    platformDefaults = { }
}
