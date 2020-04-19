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
    name: string
    color?: string
    sessionOptions: SessionOptions
    shell?: string
    isBuiltin?: boolean
    icon?: string
}

export interface TerminalColorScheme {
    name: string
    foreground: string
    background: string
    cursor: string
    colors: string[]
}

export interface Shell {
    id: string
    name?: string
    command: string
    args?: string[]
    env: {[id: string]: string}

    /**
     * Base path to which shell's internal FS is relative
     * Currently used for WSL only
     */
    fsBase?: string

    /**
     * SVG icon
     */
    icon?: string

    hidden?: boolean
}
