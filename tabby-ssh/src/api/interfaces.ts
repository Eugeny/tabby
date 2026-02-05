import { ConnectableTerminalProfile, InputProcessingOptions, LoginScriptsOptions } from 'tabby-terminal'

export enum SSHAlgorithmType {
    HMAC = 'hmac',
    KEX = 'kex',
    CIPHER = 'cipher',
    HOSTKEY = 'serverHostKey',
    COMPRESSION = 'compression',

}

export interface SSHProfile extends ConnectableTerminalProfile {
    options: SSHProfileOptions
}

export interface SSHProfileOptions extends LoginScriptsOptions {
    host: string
    port?: number
    user: string
    auth: null|'password'|'publicKey'|'agent'|'keyboardInteractive'
    password: string
    privateKeys: string[]
    keepaliveInterval: number
    keepaliveCountMax: number
    readyTimeout: number | null
    x11: boolean
    skipBanner: boolean
    jumpHost: string | null
    agentForward: boolean
    warnOnClose: boolean
    algorithms: Record<SSHAlgorithmType, string[]>
    proxyCommand: string | null
    forwardedPorts: ForwardedPortConfig[]
    socksProxyHost: string | null
    socksProxyPort: number | null
    httpProxyHost: string | null
    httpProxyPort: number | null
    reuseSession: boolean
    input: InputProcessingOptions,
    totpSecret?: string
}

export enum PortForwardType {
    Local = 'Local',
    Remote = 'Remote',
    Dynamic = 'Dynamic',
}

export interface ForwardedPortConfig {
    type: PortForwardType
    host: string
    port: number
    targetAddress: string
    targetPort: number
    description: string
}
