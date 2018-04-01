export interface IToolbarButton {
    icon: string
    title: string
    touchBarTitle?: string
    weight?: number
    click: () => void
}

export abstract class ToolbarButtonProvider {
    abstract provide (): IToolbarButton[]
}
