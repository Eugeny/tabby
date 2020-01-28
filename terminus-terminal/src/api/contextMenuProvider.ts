import { BaseTerminalTabComponent } from './baseTerminalTab.component'

/**
 * Extend to add more terminal context menu items
 * @deprecated
 */
export abstract class TerminalContextMenuItemProvider {
    weight: number

    abstract async getItems (tab: BaseTerminalTabComponent): Promise<Electron.MenuItemConstructorOptions[]>
}
