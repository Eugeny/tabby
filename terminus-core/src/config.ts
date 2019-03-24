import { ConfigProvider } from './api/configProvider'
import { Platform } from './services/hostApp.service'

/** @hidden */
export class CoreConfigProvider extends ConfigProvider {
    platformDefaults = {
        [Platform.macOS]: require('./configDefaults.macos.yaml'),
        [Platform.Windows]: require('./configDefaults.windows.yaml'),
        [Platform.Linux]: require('./configDefaults.linux.yaml'),
    }
    defaults = require('./configDefaults.yaml')
}
