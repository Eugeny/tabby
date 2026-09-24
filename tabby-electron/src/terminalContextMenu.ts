import * as fs from 'fs'
import { Injectable } from '@angular/core'
import { MenuItemOptions, NotificationsService, TranslateService, ContextMenuItemDefinitionProvider, ContextMenuItemDefinition } from 'tabby-core'
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
                id: 'export-to-file',
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

/** @hidden */
@Injectable()
export class ElectronContextMenuItemDefinitions extends ContextMenuItemDefinitionProvider {
    constructor (private translate: TranslateService) {
        super()
    }

    getItems (): ContextMenuItemDefinition[] {
        // Weight mirrors LegacyContextMenu's real `weight = 1` (the wrapper
        // that actually places this item at runtime, not
        // ExportTerminalContextMenu's own unused weight).
        return [
            { id: 'export-to-file', name: this.translate.instant('Export to file'), weight: 1 },
        ]
    }
}
