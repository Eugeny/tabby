import * as fs from 'fs'
import { Injectable } from '@angular/core'
import { BaseTabComponent, MenuItemOptions, NotificationsService, TabContextMenuItemProvider, TranslateService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { ElectronService } from './services/electron.service'

/** @hidden */
@Injectable()
export class ExportTerminalContextMenu extends TabContextMenuItemProvider {
    weight = 0

    constructor (
        private electron: ElectronService,
        private notifications: NotificationsService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
        if (!(tab instanceof BaseTerminalTabComponent)) {
            return []
        }

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
