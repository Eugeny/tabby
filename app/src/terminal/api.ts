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
}

export abstract class SessionPersistenceProvider {
    abstract async recoverSession (recoveryId: any): Promise<SessionOptions>
    abstract async createSession (options: SessionOptions): Promise<SessionOptions>
    abstract async terminateSession (recoveryId: string): Promise<void>
}
