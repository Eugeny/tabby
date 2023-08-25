import { ConfigProvider } from './api/configProvider'
import { Platform } from './api/hostApp'

/** @hidden */
export class CoreConfigProvider extends ConfigProvider {
    platformDefaults = {
        [Platform.macOS]: require('./configDefaults.macos.yaml').default,
        [Platform.Windows]: require('./configDefaults.windows.yaml').default,
        [Platform.Linux]: require('./configDefaults.linux.yaml').default,
        [Platform.Web]: require('./configDefaults.web.yaml').default,
    }

    defaults = require('./configDefaults.yaml').default
}
