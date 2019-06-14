import { SafeHtml } from '@angular/platform-browser'

/**
 * See [[ToolbarButtonProvider]]
 */
export interface ToolbarButton {
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

    click?: () => void

    submenu?: () => Promise<ToolbarButton[]>

    /** @hidden */
    submenuItems?: ToolbarButton[]
}

/**
 * Extend to add buttons to the toolbar
 */
export abstract class ToolbarButtonProvider {
    abstract provide (): ToolbarButton[]
}
