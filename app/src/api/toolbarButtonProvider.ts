export interface IToolbarButton {
    icon: string
    title: string
    weight?: number
    click: () => void
}

export interface IToolbarButtonProvider {
    provide (): IToolbarButton[]
}

export const ToolbarButtonProviderType = 'app:ToolbarButtonProviderType'
