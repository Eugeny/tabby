/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'
import { ForwardedPortConfig, PortForwardType } from 'tabby-ssh'
import { ETSession } from '../session/etSession'

/** @hidden */
@Component({
    templateUrl: './etPortForwardingModal.component.pug',
})
export class ETPortForwardingModalComponent {
    @Input() session: ETSession

    /**
     * The forwards this SESSION has right now - NOT the profile's saved list.
     *
     * `session.profile` is a ConfigProxy over the object inside config.store, so
     * pushing to its forwardedPorts wrote straight through to the user's saved
     * profile and was persisted on the next config.save(): a forward added "just
     * for this session" became permanent, and one removed for this session
     * vanished from the profile. tabby-ssh's equivalent modal keeps runtime
     * forwards on the session for exactly this reason; the saved list is edited
     * in profile settings, which binds the same component to the profile.
     */
    get model (): ForwardedPortConfig[] {
        return this.session.forwards.activeForwards
    }

    async onForwardAdded (fw: ForwardedPortConfig): Promise<void> {
        if (fw.type === PortForwardType.Remote) {
            // Reverse tunnels are fixed at INITIAL_PAYLOAD time by the protocol.
            this.session.emitServiceMessage(
                'Remote forwards can only be added before connecting. Add it to the profile and reconnect.',
            )
            return
        }
        try {
            // addLocalForward registers it in activeForwards on success, so a
            // forward that fails to bind never appears in the list.
            await this.session.forwards.addLocalForward(fw)
        } catch (e) {
            this.session.emitServiceMessage(`Could not forward port: ${e.message}`)
        }
    }

    onForwardRemoved (fw: ForwardedPortConfig): void {
        if (fw.type === PortForwardType.Remote) {
            // The server binds reverse tunnels at INITIAL_PAYLOAD time and there is
            // no packet to tear one down, so removal can only edit the profile.
            this.session.emitServiceMessage(
                'Remote forwards can only be removed before connecting. Remove it from the profile and reconnect.',
            )
            return
        }
        this.session.forwards.removeForward(fw)
    }
}
