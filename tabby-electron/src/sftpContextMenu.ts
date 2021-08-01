import * as tmp from 'tmp-promise'
import * as path from 'path'
import * as fs from 'fs'
import { Subject, debounceTime, debounce } from 'rxjs'
import { Injectable } from '@angular/core'
import { MenuItemOptions } from 'tabby-core'
import { SFTPFile, SFTPPanelComponent, SFTPContextMenuItemProvider, SFTPSession } from 'tabby-ssh'
import { ElectronPlatformService } from './services/platform.service'


/** @hidden */
@Injectable()
export class EditSFTPContextMenu extends SFTPContextMenuItemProvider {
    weight = 0

    constructor (
        private platform: ElectronPlatformService,
    ) {
        super()
    }

    async getItems (item: SFTPFile, panel: SFTPPanelComponent): Promise<MenuItemOptions[]> {
        if (item.isDirectory) {
            return []
        }
        return [
            {
                click: () => this.edit(item, panel.sftp),
                label: 'Edit locally',
            },
        ]
    }

    private async edit (item: SFTPFile, sftp: SFTPSession) {
        const tempDir = (await tmp.dir({ unsafeCleanup: true })).path
        const tempPath = path.join(tempDir, item.name)
        const transfer = await this.platform.startDownload(item.name, item.mode, item.size, tempPath)
        if (!transfer) {
            return
        }
        await sftp.download(item.fullPath, transfer)
        this.platform.openPath(tempPath)

        const events = new Subject<string>()
        const watcher = fs.watch(tempPath, event => events.next(event))
        events.pipe(debounceTime(1000), debounce(async event => {
            if (event === 'rename') {
                watcher.close()
            }
            const upload = await this.platform.startUpload({ multiple: false }, [tempPath])
            if (!upload.length) {
                return
            }
            sftp.upload(item.fullPath, upload[0])
        })).subscribe()
        watcher.on('close', () => events.complete())
        sftp.closed$.subscribe(() => watcher.close())
    }
}
