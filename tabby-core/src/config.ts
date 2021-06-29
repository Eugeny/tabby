import { ConfigProvider } from './api/configProvider'
import { Platform } from './api/hostApp'

/** @hidden */
export class CoreConfigProvider extends ConfigProvider {
    platformDefaults = {
        [Platform.macOS]: require('./configDefaults.macos.yaml'),
        [Platform.Windows]: require('./configDefaults.windows.yaml'),
        [Platform.Linux]: require('./configDefaults.linux.yaml'),
        [Platform.Web]: require('./configDefaults.web.yaml'),
    }
    defaults = require('./configDefaults.yaml')
}
