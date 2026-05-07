/**
 * Extend to add a custom CSS theme
 */
export abstract class Theme {
    name: string

    /**
     * Complete CSS stylesheet
     */
    css: string

    terminalBackground: string

    macOSWindowButtonsInsetX?: number
    macOSWindowButtonsInsetY?: number
    followsColorScheme?: boolean
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
