export type MenuItemOptions = {
    sublabel?: string
    enabled?: boolean
    checked?: boolean
    submenu?: MenuItemOptions[]
    click?: () => void

    /** @hidden */
    commandLabel?: string
} & ({
    type: 'separator',
    label?: string,
} | {
    type?: 'normal' | 'submenu' | 'checkbox' | 'radio',
    label: string,
})
