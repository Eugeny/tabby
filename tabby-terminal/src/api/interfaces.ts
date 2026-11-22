import { ConnectableProfile, Profile, TerminalColorScheme } from 'tabby-core'

export interface ResizeEvent {
    columns: number
    rows: number
}

export type RightClickBehavior = 'off'|'menu'|'paste'|'clipboard'

export interface BaseTerminalProfile extends Profile {
    terminalColorScheme: TerminalColorScheme | null

    /** Overrides the global terminal right-click behavior for this profile. `null` uses the global setting. */
    rightClick?: RightClickBehavior | null
}

export interface ConnectableTerminalProfile extends BaseTerminalProfile, ConnectableProfile {}
