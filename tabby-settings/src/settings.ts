import { Injectable } from '@angular/core'
import { SettingsTabProvider } from './api'
import { HotkeySettingsTabComponent } from './components/hotkeySettingsTab.component'
import { WindowSettingsTabComponent } from './components/windowSettingsTab.component'
import { VaultSettingsTabComponent } from './components/vaultSettingsTab.component'
import { ConfigSyncSettingsTabComponent } from './components/configSyncSettingsTab.component'
import { ProfilesSettingsTabComponent } from './components/profilesSettingsTab.component'
import { ConfigSyncService } from './services/configSync.service'

/** @hidden */
@Injectable()
export class HotkeySettingsTabProvider extends SettingsTabProvider {
    id = 'hotkeys'
    icon = 'keyboard'
    title = 'Hotkeys'

    getComponentType (): any {
        return HotkeySettingsTabComponent
    }
}


/** @hidden */
@Injectable()
export class WindowSettingsTabProvider extends SettingsTabProvider {
    id = 'window'
    icon = 'window-maximize'
    title = 'Window'

    getComponentType (): any {
        return WindowSettingsTabComponent
    }
}


/** @hidden */
@Injectable()
export class VaultSettingsTabProvider extends SettingsTabProvider {
    id = 'vault'
    icon = 'key'
    title = 'Vault'

    getComponentType (): any {
        return VaultSettingsTabComponent
    }
}


/** @hidden */
@Injectable()
export class ProfilesSettingsTabProvider extends SettingsTabProvider {
    id = 'profiles'
    icon = 'window-restore'
    title = 'Profiles'

    getComponentType (): any {
        return ProfilesSettingsTabComponent
    }
}

/** @hidden */
@Injectable()
export class ConfigSyncSettingsTabProvider extends SettingsTabProvider {
    id = 'config-sync'
    icon = 'cloud'
    title = 'Config sync'

    constructor (
        private configSync: ConfigSyncService,
    ) { super() }

    getComponentType (): any {
        if (!this.configSync.isAvailable()) {
            return null
        }
        return ConfigSyncSettingsTabComponent
    }
}
