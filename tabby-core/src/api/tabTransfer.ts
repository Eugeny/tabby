import { BaseTabComponent } from '../components/baseTab.component'
import { RecoveryToken } from './tabRecovery'

/**
 * Extend to let your tabs move between windows without restarting what's running in them.
 *
 * Tabs that no provider applies to are moved by recreating them in the
 * other window from their recovery token (see [[TabRecoveryProvider]]).
 */
export abstract class TabTransferProvider<T extends BaseTabComponent = BaseTabComponent> {
    /**
     * Providers with a higher weight are asked first
     */
    weight = 0

    abstract applicableTo (tab: BaseTabComponent): boolean

    /**
     * Prepares the tab for being taken over by another window
     *
     * @returns a recovery token that lets the other window recreate the tab
     *          with its live state, or `null` if the tab can't be moved
     */
    abstract prepare (tab: T): Promise<RecoveryToken|null>

    /**
     * Called once another window has taken the tab over. The tab has already been
     * removed from this window - let go of it without ending its session.
     */
    abstract release (tab: T): Promise<void>

    /**
     * Called if the transfer didn't go through after [[prepare]] - resume the tab
     */
    abstract cancel (tab: T): Promise<void>
}
