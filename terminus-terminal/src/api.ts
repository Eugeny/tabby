import { TerminalTabComponent } from './components/terminalTab.component'
export { TerminalTabComponent }

export abstract class TerminalDecorator {
    attach (_terminal: TerminalTabComponent): void { }
    detach (_terminal: TerminalTabComponent): void { }
}

export interface ResizeEvent {
    width: number
    height: number
}

export interface SessionOptions {
    name?: string
    command?: string
    args?: string[]
    cwd?: string
    env?: any
    recoveryId?: string
    recoveredTruePID?: number
}

export abstract class SessionPersistenceProvider {
    abstract async attachSession (recoveryId: any): Promise<SessionOptions>
    abstract async startSession (options: SessionOptions): Promise<any>
    abstract async terminateSession (recoveryId: string): Promise<void>
}

export interface ITerminalColorScheme {
    name: string
    foreground: string
    background: string
    cursor: string
    colors: string[]
}

export abstract class TerminalColorSchemeProvider {
    abstract async getSchemes (): Promise<ITerminalColorScheme[]>
}
