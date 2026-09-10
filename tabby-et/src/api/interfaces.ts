import { ConnectableTerminalProfile, InputProcessingOptions, LoginScriptsOptions } from 'tabby-terminal'
import { ForwardedPortConfig } from 'tabby-ssh'

export interface ETProfile extends ConnectableTerminalProfile {
    options: ETProfileOptions
}

export interface ETProfileOptions extends LoginScriptsOptions {
    // --- connection ---
    /** Hostname of the ET server. */
    host: string
    /** etserver TCP port. Default 2022. */
    port: number
    /** Remote username. Empty means "ask", resolved by the SSH layer. */
    user: string

    // --- SSH bootstrap ---
    /** Id of an existing SSH profile to use for the bootstrap. Null = synthesise one. */
    sshProfile: string|null
    /** SSH port when synthesising a profile. Ignored when sshProfile is set. */
    sshPort: number
    /** Override the remote etterminal binary path. */
    etterminalPath: string|null
    /** Pass --serverfifo to etterminal (non-default etserver socket). */
    serverFifo: string|null
    /** Run `pkill etterminal -u <user>` before bootstrapping. Equivalent to `et -x`. */
    killOtherSessions: boolean
    /** etterminal --verbose level, 0-9. */
    verbose: number
    /**
     * Bytes of remote stdout/stderr kept while waiting for the IDPASSKEY marker
     * during the SSH bootstrap. Null = the 64 KiB default. The cap exists so a
     * chatty shell cannot grow renderer memory for the whole bootstrap timeout;
     * the effective value is clamped to [1 KiB, 16 MiB] (§8.3).
     */
    bootstrapCaptureLimit: number|null

    // --- session behaviour ---
    /** Keepalive probe interval in SECONDS. ET clamps this to 1-5. */
    keepaliveInterval: number
    /** 0 = retry forever, matching the reference client. */
    maxReconnectAttempts: number
    warnOnClose: boolean|null

    // --- forwarding ---
    /** Only Local and Remote are valid; ET has no Dynamic/SOCKS forwarding. */
    forwardedPorts: ForwardedPortConfig[]
    forwardAgent: boolean

    // --- environment ---
    /** Sent as InitialPayload.environmentvariables. Ignored by etserver < 7.0.0. */
    environmentVariables: Record<string, string>

    // --- ET-native jump host ---
    jumpHost: string|null
    jumpPort: number
    jumpSshProfile: string|null
    jumpSshPort: number

    input: InputProcessingOptions
}
