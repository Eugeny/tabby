export declare type ComponentType = new (...args: any[]) => any

export abstract class SettingsTabProvider {
    id: string
    title: string

    getComponentType (): ComponentType {
        return null
    }
}
