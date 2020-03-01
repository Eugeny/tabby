import { Subscription } from 'rxjs'
import { BaseTerminalTabComponent } from './baseTerminalTab.component'

/**
 * Extend to automatically run actions on new terminals
 */
export abstract class TerminalDecorator {
    private smartSubscriptions = new Map<BaseTerminalTabComponent, Subscription[]>()

    /**
     * Called when a new terminal tab starts
     */
    attach (terminal: BaseTerminalTabComponent): void { } // eslint-disable-line

    /**
     * Called before a terminal tab is destroyed.
     * Make sure to call super()
     */
    detach (terminal: BaseTerminalTabComponent): void {
        for (const s of this.smartSubscriptions.get(terminal) || []) {
            s.unsubscribe()
        }
        this.smartSubscriptions.delete(terminal)
    }

    /**
     * Automatically cancel @subscription once detached from @terminal
     */
    protected subscribeUntilDetached (terminal: BaseTerminalTabComponent, subscription: Subscription): void {
        if (!this.smartSubscriptions.has(terminal)) {
            this.smartSubscriptions.set(terminal, [])
        }
        this.smartSubscriptions.get(terminal)?.push(subscription)
    }
}
