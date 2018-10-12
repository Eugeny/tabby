import { Observable } from 'rxjs'
import { TerminalTabComponent } from './components/terminalTab.component'

export abstract class TerminalDecorator {
    // tslint:disable-next-line no-empty
    attach (_terminal: TerminalTabComponent): void { }
    // tslint:disable-next-line no-empty
    detach (_terminal: TerminalTabComponent): void { }
}

export interface ResizeEvent {
    columns: number
    rows: number
}

export interface SessionOptions {
    name?: string
    command?: string
    args?: string[]
    cwd?: string
    env?: any
    width?: number
    height?: number
    recoveryId?: string
    recoveredTruePID$?: Observable<number>
    pauseAfterExit?: boolean
}

export abstract class SessionPersistenceProvider {
    abstract id: string
    abstract displayName: string

    abstract isAvailable (): boolean
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

export interface IShell {
    id: string
    name?: string
    command: string
    args?: string[]
    env?: any
    fsBase?: string
}

export abstract class ShellProvider {
    abstract async provide (): Promise<IShell[]>
}
