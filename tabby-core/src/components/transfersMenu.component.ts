import { Component, Input, Output, EventEmitter } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { FileDownload, FileTransfer, PlatformService } from '../api/platform'

/** @hidden */
@Component({
    selector: 'transfers-menu',
    templateUrl: './transfersMenu.component.pug',
    styleUrls: ['./transfersMenu.component.scss'],
})
export class TransfersMenuComponent {
    @Input() transfers: FileTransfer[]
    @Output() transfersChange = new EventEmitter<FileTransfer[]>()

    constructor (
        private platform: PlatformService,
        private translate: TranslateService,
    ) { }

    isDownload (transfer: FileTransfer): boolean {
        return transfer instanceof FileDownload
    }

    getProgress (transfer: FileTransfer): number {
        return Math.round(100 * transfer.getCompletedBytes() / transfer.getSize())
    }

    showTransfer (transfer: FileTransfer): void {
        const fp = transfer['filePath']
        if (fp) {
            this.platform.showItemInFolder(fp)
        }
    }

    removeTransfer (transfer: FileTransfer): void {
        if (!transfer.isComplete()) {
            transfer.cancel()
        }
        this.transfers = this.transfers.filter(x => x !== transfer)
        this.transfersChange.emit(this.transfers)
    }

    async removeAll (): Promise<void> {
        if (this.transfers.some(x => !x.isComplete())) {
            if ((await this.platform.showMessageBox({
                type: 'warning',
                message: this.translate.instant('There are active file transfers'),
                buttons: [
                    this.translate.instant('Abort all'),
                    this.translate.instant('Do not abort'),
                ],
                defaultId: 1,
                cancelId: 1,
            })).response === 1) {
                return
            }
        }
        for (const t of this.transfers) {
            this.removeTransfer(t)
        }
    }
}
