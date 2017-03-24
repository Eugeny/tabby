import { Tab } from './tab'

export interface ITabRecoveryProvider {
    recover (recoveryToken: any): Tab
}

export const TabRecoveryProviderType = 'app:TabRecoveryProviderType'
