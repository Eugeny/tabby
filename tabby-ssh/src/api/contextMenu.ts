import { MenuItemOptions } from 'tabby-core'
import { SFTPFile } from '../session/sftp'
import { SFTPPanelComponent } from '../components/sftpPanel.component'

declare module 'tabby-core' {
    interface CommandContext {
        /** Set when building the SFTP panel item menu (CommandLocation.SFTPItemMenu) */
        sftpItem?: SFTPFile
        sftpPanel?: SFTPPanelComponent
    }
}

/**
 * @deprecated Use a CommandProvider with CommandLocation.SFTPItemMenu and context.sftpItem / context.sftpPanel
 */
export abstract class SFTPContextMenuItemProvider {
    weight = 0

    abstract getItems (item: SFTPFile, panel: SFTPPanelComponent): Promise<MenuItemOptions[]>
}
