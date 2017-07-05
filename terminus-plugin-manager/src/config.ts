import { ConfigProvider } from 'terminus-core'

export class PluginsConfigProvider extends ConfigProvider {
    defaults = {
        npm: 'npm',
    }
}
