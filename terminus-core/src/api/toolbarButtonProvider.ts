import { SafeHtml } from '@angular/platform-browser'

export interface IToolbarButton {
    icon: SafeHtml
    title: string
    touchBarTitle?: string
    weight?: number
    click: () => void
}

export abstract class ToolbarButtonProvider {
    abstract provide (): IToolbarButton[]
}
