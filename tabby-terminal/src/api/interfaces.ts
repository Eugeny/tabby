import { ConnectableProfile, Profile, TerminalColorScheme } from 'tabby-core'

export interface ResizeEvent {
    columns: number
    rows: number
}

export interface BaseTerminalProfile extends Profile {
    terminalColorScheme: TerminalColorScheme | null
}

export interface ConnectableTerminalProfile extends BaseTerminalProfile, ConnectableProfile {}
