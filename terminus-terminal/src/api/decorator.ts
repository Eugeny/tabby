import { BaseTerminalTabComponent } from './baseTerminalTab.component'

/**
 * Extend to automatically run actions on new terminals
 */
export abstract class TerminalDecorator {
    /**
     * Called when a new terminal tab starts
     */
    attach (terminal: BaseTerminalTabComponent): void { } // eslint-disable-line

    /**
     * Called before a terminal tab is destroyed
     */
    detach (terminal: BaseTerminalTabComponent): void { } // eslint-disable-line
}
