/**
 * Minimal structural types so this helper stays independent of xterm and can
 * be unit tested without loading the whole frontend.
 */
export interface ScreenLine {
    translateToString: (trimRight?: boolean) => string
}

export interface ScreenBuffer {
    viewportY: number
    length: number
    getLine: (y: number) => ScreenLine|undefined
}

/**
 * Returns the text of the rows currently visible in the terminal viewport,
 * as rendered by the frontend (not the current selection and not the whole
 * scrollback). Trailing blank rows are dropped; interior blank rows are kept.
 */
export function getScreenText (buffer: ScreenBuffer, rows: number): string {
    const start = Math.max(0, Math.min(buffer.viewportY, buffer.length))
    const end = Math.min(buffer.length, start + rows)
    const lines: string[] = []
    for (let i = start; i < end; i++) {
        lines.push(buffer.getLine(i)?.translateToString(true) ?? '')
    }
    return lines.join('\n').replace(/\n+$/, '')
}
