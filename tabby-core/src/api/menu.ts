export interface MenuItemOptions {
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'
    label?: string
    sublabel?: string
    enabled?: boolean
    checked?: boolean
    submenu?: MenuItemOptions[]
    click?: () => void

    /** @hidden */
    commandLabel?: string

    /**
     * Stable identifier used to let the user enable/disable this item from the
     * "Context menu" settings tab. Only top-level items that set this are configurable.
     */
    id?: string
}
