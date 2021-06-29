export interface MenuItemOptions {
    type?: ('normal' | 'separator' | 'submenu' | 'checkbox' | 'radio')
    label?: string
    sublabel?: string
    enabled?: boolean
    checked?: boolean
    submenu?: MenuItemOptions[]
    click?: () => void
}
