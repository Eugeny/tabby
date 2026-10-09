/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Component, Input } from '@angular/core'
import { NotificationsService, TranslateService } from 'tabby-core'
import { ForwardedPort } from '../session/forwards'
import { SSHSession } from '../session/ssh'
import { ForwardedPortConfig } from '../api'

/** @hidden */
@Component({
    templateUrl: './sshPortForwardingModal.component.pug',
})
export class SSHPortForwardingModalComponent {
    @Input() session: SSHSession

    constructor (
        private notifications: NotificationsService,
        private translate: TranslateService,
    ) { }

    async onForwardAdded (fw: ForwardedPortConfig) {
        const newForward = new ForwardedPort()
        Object.assign(newForward, fw)
        try {
            await this.session.addPortForward(newForward)
            this.notifications.info(this.translate.instant(_('Forwarded {fw}'), { fw: newForward.toString() }))
        } catch (e) {
            this.notifications.error(this.translate.instant(_('Failed to forward port {fw}'), { fw: newForward.toString() }), e.toString())
        }
    }

    async onForwardRemoved (fwConfig: ForwardedPortConfig) {
        const fw = fwConfig as ForwardedPort
        try {
            await this.session.removePortForward(fw)
            this.notifications.notice(this.translate.instant(_('Stopped forwarding {fw}'), { fw: fw.toString() }))
        } catch (e) {
            this.notifications.error(this.translate.instant(_('Failed to stop forwarding {fw}'), { fw: fw.toString() }), e.toString())
        }
    }
}
