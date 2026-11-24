import * as tmp from 'tmp-promise'
import * as fs from 'fs'
import { Subject, debounceTime, debounce } from 'rxjs'
import { Injectable } from '@angular/core'
import { Command, CommandContext, CommandLocation, CommandProvider, TranslateService } from 'tabby-core'
import { SFTPFile, SFTPSession } from 'tabby-ssh'
import { ElectronPlatformService, resolveInsideBase } from './services/platform.service'


/** @hidden */
@Injectable({ providedIn: 'root' })
export class EditSFTPContextMenu extends CommandProvider {
    constructor (
        private translate: TranslateService,
        private platform: ElectronPlatformService,
    ) {
        super()
    }

    async provide (context: CommandContext): Promise<Command[]> {
        const { sftpItem: item, sftpPanel: panel } = context
        if (!item || !panel) {
            return []
        }
        const commands: Command[] = [
            {
                id: 'electron:sftp-copy-full-path',
                group: 'electron:sftp-item',
                label: this.translate.instant('Copy full path'),
                locations: [CommandLocation.SFTPItemMenu],
                run: async () => this.platform.setClipboard({
                    text: item.fullPath,
                }),
            },
        ]
        if (!item.isDirectory) {
            commands.push({
                id: 'electron:sftp-edit-locally',
                group: 'electron:sftp-item',
                label: this.translate.instant('Edit locally'),
                locations: [CommandLocation.SFTPItemMenu],
                // Don't hold CommandService's serialized run queue for the whole transfer
                run: async () => { void this.edit(item, panel.sftp) },
            })
        }
        return commands
    }

    private async edit (item: SFTPFile, sftp: SFTPSession) {
        const tempDir = (await tmp.dir({ unsafeCleanup: true })).path
        const tempPath = resolveInsideBase(tempDir, item.name)
        const transfer = await this.platform.startDownload(item.name, item.mode, item.size, tempPath)
        if (!transfer) {
            return
        }
        await sftp.download(item.fullPath, transfer)
        this.platform.openPath(tempPath)

        const events = new Subject<string>()
        fs.chmodSync(tempPath, 0o700)

        // skip the first burst of events
        setTimeout(() => {
            const watcher = fs.watch(tempPath, event => events.next(event))
            events.pipe(debounceTime(1000), debounce(async event => {
                if (event === 'rename') {
                    watcher.close()
                }
                const upload = await this.platform.startUpload({ multiple: false }, [tempPath])
                if (!upload.length) {
                    return
                }
                await sftp.upload(item.fullPath, upload[0])
                await sftp.chmod(item.fullPath, item.mode)
            })).subscribe()
            watcher.on('close', () => events.complete())
            sftp.closed$.subscribe(() => watcher.close())
        }, 1000)
    }
}
