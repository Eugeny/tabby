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
}
