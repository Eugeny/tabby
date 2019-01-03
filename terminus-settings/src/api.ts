export abstract class SettingsTabProvider {
    id: string
    icon: string
    title: string

    getComponentType (): any {
        return null
    }
}
