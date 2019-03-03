import { TabComponentType } from '../services/tabs.service'

export interface RecoveredTab {
    type: TabComponentType,
    options?: any,
}

export abstract class TabRecoveryProvider {
    abstract async recover (recoveryToken: any): Promise<RecoveredTab | null>
}
