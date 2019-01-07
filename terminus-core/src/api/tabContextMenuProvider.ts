import { BaseTabComponent } from '../components/baseTab.component'
import { TabHeaderComponent } from '../components/tabHeader.component'

export abstract class TabContextMenuItemProvider {
    weight = 0

    abstract async getItems (tab: BaseTabComponent, tabHeader?: TabHeaderComponent): Promise<Electron.MenuItemConstructorOptions[]>
}
