import deepClone from 'clone-deep'
import { BaseTabComponent } from '../components/baseTab.component'
import { NewTabParameters } from '../services/tabs.service'

export interface RecoveryToken {
    [_: string]: any
    type: string
    tabColor?: string|null
}

/**
 * Extend to enable recovery for your custom tab.
 * This works in conjunction with [[getRecoveryToken()]]
 *
 * Tabby will try to find any [[TabRecoveryProvider]] that is able to process
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
export abstract class TabRecoveryProvider <T extends BaseTabComponent> {
    /**
     * @param recoveryToken a recovery token found in the saved tabs list
     * @returns [[boolean]] whether this [[TabRecoveryProvider]] can recover a tab from this token
     */

    abstract applicableTo (recoveryToken: RecoveryToken): Promise<boolean>

    /**
     * @param recoveryToken a recovery token found in the saved tabs list
     * @returns [[NewTabParameters]] descriptor containing tab type and component inputs
     *          or `null` if this token is from a different tab type or is not supported
     */
    abstract recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<T>>

    /**
     * @param recoveryToken a recovery token found in the saved tabs list
     * @returns [[RecoveryToken]] a new recovery token to create the duplicate tab from
     *
     * The default implementation just returns a deep copy of the original token
     */
    duplicate (recoveryToken: RecoveryToken): RecoveryToken {
        return deepClone(recoveryToken)
    }
}
