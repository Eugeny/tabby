import * as fs from 'fs'
import { Injectable } from '@angular/core'
import { Command, CommandContext, CommandLocation, CommandProvider, NotificationsService, TranslateService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { ElectronService } from './services/electron.service'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class ExportTerminalContextMenu extends CommandProvider {
    constructor (
        private electron: ElectronService,
        private notifications: NotificationsService,
        private translate: TranslateService,
    ) {
        super()
    }

    async provide (context: CommandContext): Promise<Command[]> {
        const tab = context.tab
        if (!(tab instanceof BaseTerminalTabComponent)) {
            return []
        }
        return [{
            id: 'electron:export-terminal-to-file',
            label: this.translate.instant('Export to file'),
            locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
            run: async () => {
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
        }]
    }
}
