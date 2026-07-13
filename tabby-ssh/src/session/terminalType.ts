export const DEFAULT_SSH_TERMINAL_TYPE = 'xterm-256color'

export function resolveSSHTerminalType (term: string | null | undefined): string {
    const trimmed = term?.trim()
    if (!trimmed) {
        return DEFAULT_SSH_TERMINAL_TYPE
    }
    return trimmed
}
