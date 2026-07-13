import type { Channel } from 'russh'

export const DEFAULT_SSH_TERMINAL_TYPE = 'xterm-256color'

export interface SSHShellChannelOptions {
    x11: boolean
    term: string | null | undefined
}

interface SSHShellProfile {
    options: {
        x11: boolean
        term?: string | null
    }
}

interface SSHShellChannelOpener<T> {
    openShellChannel: (options: SSHShellChannelOptions) => Promise<T>
}

export function resolveSSHTerminalType (term: string | null | undefined): string {
    const trimmed = term?.trim()
    if (!trimmed) {
        return DEFAULT_SSH_TERMINAL_TYPE
    }
    return trimmed
}

export function openShellChannelForProfile<T> (ssh: SSHShellChannelOpener<T>, profile: SSHShellProfile): Promise<T> {
    return ssh.openShellChannel({
        x11: profile.options.x11,
        term: profile.options.term,
    })
}

export function requestShellPTY (channel: Pick<Channel, 'requestPTY'>, options: Pick<SSHShellChannelOptions, 'term'>): Promise<void> {
    return channel.requestPTY(resolveSSHTerminalType(options.term), {
        columns: 80,
        rows: 24,
        pixHeight: 0,
        pixWidth: 0,
    })
}
