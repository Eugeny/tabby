import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { BaseComponent } from 'terminus-core'
import { SFTPFile, SFTPSession } from '../api'

/** @hidden */
@Component({
    template: require('./sftpDeleteModal.component.pug'),
})
export class SFTPDeleteModalComponent extends BaseComponent {
    sftp: SFTPSession
    item: SFTPFile
    progressMessage = ''
    cancelled = false

    constructor (
        private modalInstance: NgbActiveModal,
    ) {
        super()
    }

    ngOnInit (): void {
        this.destroyed$.subscribe(() => this.cancel())
        this.run(this.item).then(() => {
            this.modalInstance.close()
        })
    }

    cancel (): void {
        this.cancelled = true
        this.modalInstance.close()
    }

    async run (file: SFTPFile): Promise<void> {
        this.progressMessage = file.fullPath

        if (file.isDirectory) {
            for (const child of await this.sftp.readdir(file.fullPath)) {
                await this.run(child)
                if (this.cancelled) {
                    break
                }
            }
            await this.sftp.rmdir(file.fullPath)
        } else {
            this.sftp.unlink(file.fullPath)
        }
    }
}
