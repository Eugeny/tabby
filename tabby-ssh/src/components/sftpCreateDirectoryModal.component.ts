import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import path from 'path'
import { BaseComponent } from 'tabby-core'
import { SFTPFile, SFTPSession } from '../session/sftp'
import { SFTPPanelComponent } from './sftpPanel.component'

/** @hidden */
@Component({
    template: require('./sftpCreateDirectoryModal.component.pug'),
})
export class SFTPCreateDirectoryModalComponent extends BaseComponent {
    sftp: SFTPSession
    item: SFTPFile
    panel: SFTPPanelComponent
    directoryName: string
    
    constructor (
        private modalInstance: NgbActiveModal,
    ) {
        super()
    }

    async ngOnInit (): Promise<void> {
        
    }

    create (): void {
        this.createDirectory(this.item.directory);
    }
    cancel (): void {
        this.modalInstance.close()
    }

    async createDirectory (currentDirectory: string): Promise<void> {
        this.sftp.mkdir(path.join(currentDirectory, this.directoryName)).finally(() => {
            this.panel.navigate(path.join(currentDirectory, this.directoryName));
            this.cancel();
        });

    }
}
