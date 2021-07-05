import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class TelnetConfigProvider extends ConfigProvider {
    defaults = {
        hotkeys: {
            'telnet-profile-selector': [],
            'restart-telnet-session': [],
        },
    }

    platformDefaults = { }
}
