import { Shell } from './interfaces'

/**
 * Extend to add support for more shells
 */
export abstract class ShellProvider {
    abstract async provide (): Promise<Shell[]>
}
