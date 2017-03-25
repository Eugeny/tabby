import { Tab } from './tab'

export abstract class TabRecoveryProvider {
    abstract async recover (recoveryToken: any): Promise<Tab>
}
