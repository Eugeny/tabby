import { BaseTerminalTabComponent } from './baseTerminalTab.component'

/**
 * Extend to add more terminal context menu items
 */
export abstract class TerminalContextMenuItemProvider {
    weight: number

    abstract async getItems (tab: BaseTerminalTabComponent): Promise<Electron.MenuItemConstructorOptions[]>
}
