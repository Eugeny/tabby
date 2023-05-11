import { Profile } from 'tabby-core'

export interface ResizeEvent {
    columns: number
    rows: number
}

export interface TerminalColorScheme {
    name: string
    foreground: string
    background: string
    cursor: string
    colors: string[]
    selection?: string
    selectionForeground?: string
    cursorAccent?: string
}

export interface BaseTerminalProfile extends Profile {
    terminalColorScheme?: TerminalColorScheme
}


/**
 * Use ConnectableTerminalTab instead
 * @deprecated
 */
export interface Reconnectable {
    reconnect: () => Promise<void>;
}

/**
 * Use ConnectableTerminalTab instead
 * @deprecated
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isReconnectable (object: any): object is Reconnectable {
    return 'reconnect' in object
}
