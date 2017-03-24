export { AppService } from 'services/app'
export { PluginsService } from 'services/plugins'
export { Tab } from 'models/tab'

export interface IPlugin {

}

export interface IToolbarButton {
    icon: string
    title: string
    weight?: number
    click: () => void
}

export interface IToolbarButtonProvider {
    provide (): IToolbarButton[]
}

export const ToolbarButtonProviderType = 'app:toolbar-button-provider'
