import { MenuItemOptions } from 'tabby-core'
import { SFTPFile } from '../session/sftp'
import { SFTPPanelComponent } from '../components/sftpPanel.component'

/**
 * Extend to add items to the SFTPPanel context menu
 */
export abstract class SFTPContextMenuItemProvider {
    weight = 0

    abstract getItems (item: SFTPFile, panel: SFTPPanelComponent): Promise<MenuItemOptions[]>
}
