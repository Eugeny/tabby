import { Profile } from 'tabby-core'

export interface Shell {
    id: string
    name: string
    command: string
    args?: string[]
    env: Record<string, string>

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

/**
 * Extend to add support for more shells
 */
export abstract class ShellProvider {
    abstract provide (): Promise<Shell[]>
}


export interface SessionOptions {
    restoreFromPTYID?: string
    name?: string
    command: string
    args?: string[]
    cwd?: string
    env?: Record<string, string>
    width?: number
    height?: number
    pauseAfterExit?: boolean
    runAsAdministrator?: boolean
}

export interface LocalProfile extends Profile {
    options: SessionOptions
}

export interface ChildProcess {
    pid: number
    ppid: number
    command: string
}
