import { TabComponentType } from '../services/tabs.service'

export interface RecoveredTab {
    /**
     * Component type to be instantiated
     */
    type: TabComponentType

    /**
     * Component instance inputs
     */
    options?: any
}

/**
 * Extend to enable recovery for your custom tab.
 * This works in conjunction with [[getRecoveryToken()]]
 *
 * Terminus will try to find any [[TabRecoveryProvider]] that is able to process
 * the recovery token previously returned by [[getRecoveryToken]].
 *
 * Recommended token format:
 *
 * ```json
 * {
 *   type: 'my-tab-type',
 *   foo: 'bar',
 * }
 * ```
 */
export abstract class TabRecoveryProvider {
    /**
     * @param recoveryToken a recovery token found in the saved tabs list
     * @returns [[RecoveredTab]] descriptor containing tab type and component inputs
     *          or `null` if this token is from a different tab type or is not supported
     */
    abstract async recover (recoveryToken: any): Promise<RecoveredTab|null>
}
