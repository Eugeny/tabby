export abstract class TabRecoveryProvider {
    abstract async recover (recoveryToken: any): Promise<void>
}
