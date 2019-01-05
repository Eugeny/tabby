import { BaseTerminalTabComponent } from './components/baseTerminalTab.component'

export abstract class TerminalDecorator {
    // tslint:disable-next-line no-empty
    attach (_terminal: BaseTerminalTabComponent): void { }
    // tslint:disable-next-line no-empty
    detach (_terminal: BaseTerminalTabComponent): void { }
}

export interface ResizeEvent {
    columns: number
    rows: number
}

export interface SessionOptions {
    name?: string
    command: string
    args: string[]
    cwd?: string
    env?: any
    width?: number
    height?: number
    pauseAfterExit?: boolean
    runAsAdministrator?: boolean
}

export interface Profile {
    name: string,
    sessionOptions: SessionOptions,
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

export abstract class TerminalContextMenuItemProvider {
    weight: number

    abstract async getItems (tab: BaseTerminalTabComponent): Promise<Electron.MenuItemConstructorOptions[]>
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
