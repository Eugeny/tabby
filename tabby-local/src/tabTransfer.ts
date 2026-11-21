import { Injectable } from '@angular/core'
import { BaseTabComponent, RecoveryToken, TabTransferProvider } from 'tabby-core'

import { TerminalTabComponent } from './components/terminalTab.component'

/**
 * Moves local terminal tabs between windows by attaching the other window to
 * the same PTY - the shell and everything running in it keep going.
 *
 * @hidden
 */
@Injectable()
export class LocalTabTransferProvider extends TabTransferProvider<TerminalTabComponent> {
    weight = 10

    applicableTo (tab: BaseTabComponent): boolean {
        return tab instanceof TerminalTabComponent && !!tab.session?.open && !!tab.session.getID()
    }

    async prepare (tab: TerminalTabComponent): Promise<RecoveryToken|null> {
        // Make sure the saved state ends exactly where the other window picks up
        await tab.session!.holdOutput()
        await tab.waitForFrontendWrites()
        const token = await tab.getRecoveryToken({ includeState: true })
        token.savedState = tab.frontend?.saveState({ live: true })
        return token
    }

    async release (tab: TerminalTabComponent): Promise<void> {
        tab.session?.detach()
        tab.destroy()
    }

    async cancel (tab: TerminalTabComponent): Promise<void> {
        tab.session?.resumeOutput()
    }
}
