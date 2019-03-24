import { SafeHtml } from '@angular/platform-browser'

/**
 * See [[ToolbarButtonProvider]]
 */
export interface IToolbarButton {
    /**
     * Raw SVG icon code
     */
    icon: SafeHtml

    title: string

    /**
     * Optional Touch Bar icon ID
     */
    touchBarNSImage?: string

    /**
     * Optional Touch Bar button label
     */
    touchBarTitle?: string

    weight?: number

    click: () => void
}

/**
 * Extend to add buttons to the toolbar
 */
export abstract class ToolbarButtonProvider {
    abstract provide (): IToolbarButton[]
}
