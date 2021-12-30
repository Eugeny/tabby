import * as fs from 'fs/promises'
import * as path from 'path'
import slugify from 'slugify'
import { PortForwardType, SSHProfile, SSHProfileOptions } from './api/interfaces'
import { PartialProfile } from 'tabby-core'

function deriveID (name: string): string {
    return 'openssh-config:' + slugify(name)
}

export async function parseOpenSSHProfiles (): Promise<PartialProfile<SSHProfile>[]> {
    const results: PartialProfile<SSHProfile>[] = []
    const configPath = path.join(process.env.HOME ?? '~', '.ssh', 'config')
    try {
        const lines = (await fs.readFile(configPath, 'utf8')).split('\n')
        const globalOptions: Partial<SSHProfileOptions> = {}
        let currentProfile: PartialProfile<SSHProfile>|null = null
        for (let line of lines) {
            if (line.trim().startsWith('#') || !line.trim()) {
                continue
            }
            if (line.startsWith('Host ')) {
                if (currentProfile) {
                    results.push(currentProfile)
                }
                const name = line.substr(5).trim()
                currentProfile = {
                    id: deriveID(name),
                    name,
                    type: 'ssh',
                    group: 'Imported from .ssh/config',
                    options: {
                        ...globalOptions,
                        host: name,
                    },
                }
            } else {
                const target: Partial<SSHProfileOptions> = currentProfile?.options ?? globalOptions
                line = line.trim()
                const idx = /\s/.exec(line)?.index ?? -1
                if (idx === -1) {
                    continue
                }
                const key = line.substr(0, idx).trim()
                const value = line.substr(idx + 1).trim()

                if (key === 'IdentityFile') {
                    target.privateKeys = value.split(',').map(s => s.trim())
                } else if (key === 'RemoteForward') {
                    const bind = value.split(/\s/)[0].trim()
                    const tgt = value.split(/\s/)[1].trim()
                    target.forwardedPorts ??= []
                    target.forwardedPorts.push({
                        type: PortForwardType.Remote,
                        description: value,
                        host: bind.split(':')[0] ?? '127.0.0.1',
                        port: parseInt(bind.split(':')[1] ?? bind),
                        targetAddress: tgt.split(':')[0],
                        targetPort: parseInt(tgt.split(':')[1]),
                    })
                } else if (key === 'LocalForward') {
                    const bind = value.split(/\s/)[0].trim()
                    const tgt = value.split(/\s/)[1].trim()
                    target.forwardedPorts ??= []
                    target.forwardedPorts.push({
                        type: PortForwardType.Local,
                        description: value,
                        host: bind.split(':')[0] ?? '127.0.0.1',
                        port: parseInt(bind.split(':')[1] ?? bind),
                        targetAddress: tgt.split(':')[0],
                        targetPort: parseInt(tgt.split(':')[1]),
                    })
                } else if (key === 'DynamicForward') {
                    const bind = value.trim()
                    target.forwardedPorts ??= []
                    target.forwardedPorts.push({
                        type: PortForwardType.Dynamic,
                        description: value,
                        host: bind.split(':')[0] ?? '127.0.0.1',
                        port: parseInt(bind.split(':')[1] ?? bind),
                        targetAddress: '',
                        targetPort: 22,
                    })
                } else {
                    const mappedKey = {
                        Hostname: 'host',
                        Port: 'port',
                        User: 'user',
                        ForwardX11: 'x11',
                        ServerAliveInterval: 'keepaliveInterval',
                        ServerAliveCountMax: 'keepaliveCountMax',
                        ProxyCommand: 'proxyCommand',
                        ProxyJump: 'jumpHost',
                    }[key]
                    if (mappedKey) {
                        target[mappedKey] = value
                    }
                }
            }
        }
        if (currentProfile) {
            results.push(currentProfile)
        }
        for (const p of results) {
            if (p.options?.proxyCommand) {
                p.options.proxyCommand = p.options.proxyCommand
                    .replace('%h', p.options.host ?? '')
                    .replace('%p', (p.options.port ?? 22).toString())
            }
            if (p.options?.jumpHost) {
                p.options.jumpHost = deriveID(p.options.jumpHost)
            }
        }
        return results
    } catch (e) {
        if (e.code === 'ENOENT') {
            return []
        }
        throw e
    }
}
