/**
 * See [[ToolbarButtonProvider]]
 */
export interface ToolbarButton {
    /**
     * Raw SVG icon code
     */
    icon?: string

    title: string

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
