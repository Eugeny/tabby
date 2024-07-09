import { ConnectableTerminalProfile, InputProcessingOptions, LoginScriptsOptions } from 'tabby-terminal'

export enum SSHAlgorithmType {
    HMAC = 'hmac',
    KEX = 'kex',
    CIPHER = 'cipher',
    HOSTKEY = 'serverHostKey',
}

export interface SSHProfile extends ConnectableTerminalProfile {
    options: SSHProfileOptions
}

export interface SSHProfileOptions extends LoginScriptsOptions {
    host: string
    port?: number
    user: string
    auth?: null|'password'|'publicKey'|'agent'|'keyboardInteractive'
    password?: string
    privateKeys?: string[]
    keepaliveInterval?: number
    keepaliveCountMax?: number
    readyTimeout?: number
    x11?: boolean
    skipBanner?: boolean
    jumpHost?: string
    agentForward?: boolean
    warnOnClose?: boolean
    algorithms?: Record<string, string[]>
    proxyCommand?: string
    forwardedPorts?: ForwardedPortConfig[]
    socksProxyHost?: string
    socksProxyPort?: number
    httpProxyHost?: string
    httpProxyPort?: number
    reuseSession?: boolean
    input: InputProcessingOptions,
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
