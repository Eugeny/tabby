export abstract class TerminalDecorator {
    abstract decorate (terminal): void
}

export interface SessionOptions {
    name?: string,
    command?: string,
    args?: string[],
    cwd?: string,
    env?: any,
    recoveryId?: string
    recoveredTruePID?: number
}

export abstract class SessionPersistenceProvider {
    abstract async attachSession (recoveryId: any): Promise<SessionOptions>
    abstract async startSession (options: SessionOptions): Promise<any>
    abstract async terminateSession (recoveryId: string): Promise<void>
}
