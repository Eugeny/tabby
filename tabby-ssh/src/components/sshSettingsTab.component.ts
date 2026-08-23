import { Component, HostBinding } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { X11Socket } from '../session/x11'
import { ConfigService, HostAppService, Platform } from 'tabby-core'
import { CredentialService } from '../services/credential.service'
import { SavedCredential } from '../api'

/** @hidden */
@Component({
    templateUrl: './sshSettingsTab.component.pug',
})
export class SSHSettingsTabComponent {
    Platform = Platform
    defaultX11Display: string

    @HostBinding('class.content-box') true

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        public credentials: CredentialService,
        private ngbModal: NgbModal,
    ) {
        const spec = X11Socket.resolveDisplaySpec()
        if ('path' in spec) {
            this.defaultX11Display = spec.path
        } else {
            this.defaultX11Display = `${spec.host}:${spec.port}`
        }
    }

    async editCredential (credential?: SavedCredential): Promise<void> {
        const { CredentialEditorModalComponent } = window['nodeRequire']('tabby-ssh')
        const modal = this.ngbModal.open(
            CredentialEditorModalComponent,
            { size: 'lg' },
        )
        modal.componentInstance.credential = credential
            ? { ...credential, privateKeys: [...credential.privateKeys] }
            : { id: '', name: '', username: '', privateKeys: [] }
        await modal.result.catch(() => null)
    }

    async deleteCredential (credential: SavedCredential): Promise<void> {
        await this.credentials.deleteCredential(credential)
    }
}
