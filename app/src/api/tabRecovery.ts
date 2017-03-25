import { Tab } from './tab'

export abstract class TabRecoveryProvider {
    abstract recover (recoveryToken: any): Tab
}
