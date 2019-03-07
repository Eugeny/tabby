import { BaseTerminalTabComponent } from './components/baseTerminalTab.component'

/**
 * Extend to automatically run actions on new terminals
 */
export abstract class TerminalDecorator {
    /**
     * Called when a new terminal tab starts
     */
    attach (terminal: BaseTerminalTabComponent): void { } // tslint:disable-line no-empty

    /**
     * Called before a terminal tab is destroyed
     */
    detach (terminal: BaseTerminalTabComponent): void { } // tslint:disable-line no-empty
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
    env?: {[id: string]: string}
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

/**
 * Extend to add more terminal color schemes
 */
export abstract class TerminalColorSchemeProvider {
    abstract async getSchemes (): Promise<ITerminalColorScheme[]>
}

/**
 * Extend to add more terminal context menu items
 */
export abstract class TerminalContextMenuItemProvider {
    weight: number

    abstract async getItems (tab: BaseTerminalTabComponent): Promise<Electron.MenuItemConstructorOptions[]>
}

export interface IShell {
    id: string
    name?: string
    command: string
    args?: string[]
    env?: {[id: string]: string}

    /**
     * Base path to which shell's internal FS is relative
     * Currently used for WSL only
     */
    fsBase?: string
}

/**
 * Extend to add support for more shells
 */
export abstract class ShellProvider {
    abstract async provide (): Promise<IShell[]>
}
