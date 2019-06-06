import { ITerminalColorScheme } from './interfaces'

/**
 * Extend to add more terminal color schemes
 */
export abstract class TerminalColorSchemeProvider {
    abstract async getSchemes (): Promise<ITerminalColorScheme[]>
}
