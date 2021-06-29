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
}
