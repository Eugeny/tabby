export const BOOTSTRAP_DATA = 'BOOTSTRAP_DATA'

export interface PluginInfo {
    name: string
    description: string
    packageName: string
    isBuiltin: boolean
    isLegacy: boolean
    version: string
    author: string
    homepage?: string
    path?: string
    info?: any
}

export interface BootstrapData {
    config: Record<string, any>
    executable: string
    isFirstWindow: boolean
    windowID: number
    installedPlugins: PluginInfo[]
    userPluginsPath: string
}
