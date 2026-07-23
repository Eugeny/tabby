import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { ConfigService } from '../services/config.service'
import { DirectoryDownload, FileDownload, FileTransfer, PlatformService } from '../api/platform'

/** @hidden */
@Component({
    selector: 'transfers-menu',
    templateUrl: './transfersMenu.component.pug',
    styleUrls: ['./transfersMenu.component.scss'],
})
export class TransfersMenuComponent {
    @Input() transfers: FileTransfer[]
    @Output() transfersChange = new EventEmitter<FileTransfer[]>()
    retryLabel: string
    @HostBinding('class.vibrant') get isVibrant (): boolean {
        return this.config.store.appearance.vibrancy
    }

    constructor (
        private config: ConfigService,
        private platform: PlatformService,
        private translate: TranslateService,
    ) {
        this.retryLabel = translate.instant('Retry')
    }

    isDownload (transfer: FileTransfer): boolean {
        return transfer instanceof FileDownload
    }

    getProgress (transfer: FileTransfer): number {
        if (!transfer.getSize()) {
            return 0
        }
        // the total can lag behind (e.g. a folder size still being calculated)
        return Math.min(100, Math.round(100 * transfer.getCompletedBytes() / transfer.getSize()))
    }

    getChildren (transfer: FileTransfer): FileTransfer[] {
        return transfer instanceof DirectoryDownload ? transfer.getChildren() : []
    }

    getActiveChild (transfer: FileTransfer): FileTransfer|null {
        return this.getChildren(transfer).find(x => !x.isComplete()) ?? null
    }

    isSizeUnknown (transfer: FileTransfer): boolean {
        return transfer instanceof DirectoryDownload
            && !transfer.isSizeCalculated()
            && !transfer.isComplete() && !transfer.isFailed() && !transfer.isCancelled()
    }

    getBarType (transfer: FileTransfer): string {
        if (transfer.isFailed() || transfer.isCancelled()) {
            return 'danger'
        }
        return transfer.isComplete() ? 'success' : 'info'
    }

    getStateLabel (transfer: FileTransfer): string {
        if (transfer.isFailed()) {
            return this.translate.instant('Failed')
        }
        if (transfer.isCancelled()) {
            return this.translate.instant('Cancelled')
        }
        if (transfer.isComplete()) {
            return this.translate.instant('Done')
        }
        return ''
    }

    async retryTransfer (transfer: FileTransfer): Promise<void> {
        this.transfers = this.transfers.filter(x => x !== transfer)
        this.transfersChange.emit(this.transfers)
        if (!await transfer.retry()) {
            // nothing replaced it (e.g. the re-prompt was dismissed) — put the
            // old entry back so the retry affordance isn't lost
            this.transfers = [...this.transfers, transfer]
            this.transfersChange.emit(this.transfers)
        }
    }

    showTransfer (transfer: FileTransfer): void {
        const fp = transfer['filePath']
        if (fp) {
            this.platform.showItemInFolder(fp)
        }
    }

    removeTransfer (transfer: FileTransfer): void {
        if (!transfer.isComplete() && !transfer.isFailed()) {
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
