import { TerminalColorScheme } from './interfaces'

/**
 * Extend to add more terminal color schemes
 */
export abstract class TerminalColorSchemeProvider {
    abstract getSchemes (): Promise<TerminalColorScheme[]>
}
