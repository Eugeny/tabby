/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { KnownHost, KnownHostSelector, SSHKnownHostsService } from '../services/sshKnownHosts.service'

/** @hidden */
@Component({
    templateUrl: './hostKeyPromptModal.component.pug',
})
export class HostKeyPromptModalComponent {
    @Input() selector: KnownHostSelector
    @Input() digest: string
    knownHost: KnownHost|null
    isMismatched = false
    isUnknown = false

    constructor (
        private knownHosts: SSHKnownHostsService,
        private modalInstance: NgbActiveModal,
    ) { }

    ngOnInit () {
        this.knownHost = this.knownHosts.getFor(this.selector)
        if (!this.knownHost) {
            this.isUnknown = true
        } else if (this.knownHost.digest !== this.digest) {
            this.isMismatched = true
        }
    }

    accept () {
        this.modalInstance.close(true)
    }

    async acceptAndSave () {
        await this.knownHosts.store(this.selector, this.digest)
        this.accept()
    }

    cancel () {
        this.modalInstance.close(false)
    }
}
