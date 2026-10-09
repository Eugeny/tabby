import * as fs from 'fs'
import { Injectable } from '@angular/core'
import { MenuItemOptions, NotificationsService, TranslateService } from 'tabby-core'
import { BaseTerminalTabComponent, TerminalContextMenuItemProvider } from 'tabby-terminal'
import { ElectronService } from './services/electron.service'

/** @hidden */
@Injectable()
export class ExportTerminalContextMenu extends TerminalContextMenuItemProvider {
    weight = 0

    constructor (
        private electron: ElectronService,
        private notifications: NotificationsService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTerminalTabComponent<any>): Promise<MenuItemOptions[]> {
        return [
            {
                label: this.translate.instant('Export to file'),
                click: async () => {
                    const frontend = tab.frontend
                    if (!frontend) {
                        return
                    }
                    const result = await this.electron.dialog.showSaveDialog({
                        defaultPath: 'terminal.txt',
                    })
                    if (!result.filePath) {
                        return
                    }
                    frontend.selectAll()
                    const content = frontend.getSelection()
                    frontend.clearSelection()
                    await fs.promises.writeFile(result.filePath, content)
                    this.notifications.info(this.translate.instant('Saved to {path}', { path: result.filePath }))
                },
            },
        ]
    }
}
