import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import * as glob from 'glob'
import slugify from 'slugify'
import * as yaml from 'js-yaml'
import { Injectable } from '@angular/core'
import { PartialProfile } from 'tabby-core'
import {
    SSHProfileImporter,
    PortForwardType,
    SSHProfile,
    AutoPrivateKeyLocator,
    ForwardedPortConfig,
} from 'tabby-ssh'

import { ElectronService } from './services/electron.service'
import SSHConfig, { Directive, LineType } from 'ssh-config'

// Enum to delineate the properties in SSHProfile options
enum SSHProfilePropertyNames {
    Host = 'host',
    Port = 'port',
    User = 'user',
    X11 = 'x11',
    PrivateKeys = 'privateKeys',
    KeepaliveInterval = 'keepaliveInterval',
    KeepaliveCountMax = 'keepaliveCountMax',
    ReadyTimeout = 'readyTimeout',
    JumpHost = 'jumpHost',
    AgentForward = 'agentForward',
    ProxyCommand = 'proxyCommand',
    ForwardedPorts = 'forwardedPorts',
}

// Data structure to map the (lowercase) ssh-config attributes (as keys) to a tuple
// containing the name of the corresponding SSHProfile attribute
const decodeFields: Record<string, SSHProfilePropertyNames> = {
    hostname: SSHProfilePropertyNames.Host,
    user: SSHProfilePropertyNames.User,
    port: SSHProfilePropertyNames.Port,
    forwardx11: SSHProfilePropertyNames.X11,
    serveraliveinterval: SSHProfilePropertyNames.KeepaliveInterval,
    serveralivecountmax: SSHProfilePropertyNames.KeepaliveCountMax,
    connecttimeout: SSHProfilePropertyNames.ReadyTimeout,
    proxyjump: SSHProfilePropertyNames.JumpHost,
    forwardagent: SSHProfilePropertyNames.AgentForward,
    identityfile: SSHProfilePropertyNames.PrivateKeys,
    proxycommand: SSHProfilePropertyNames.ProxyCommand,
    localforward: SSHProfilePropertyNames.ForwardedPorts,
    remoteforward: SSHProfilePropertyNames.ForwardedPorts,
    dynamicforward: SSHProfilePropertyNames.ForwardedPorts,
}

// Function to use the above to return details corresponding to the supplied SSHProperty name.
// If the name of the supplied SSH Config file Property is valid, and one that we process,
// then we get back the name of the corresponding Property in the SSHProfile object
function decodeTarget (SSHProperty: string): string {
    const lower = SSHProperty.toLowerCase()
    if (lower in decodeFields) {
        return decodeFields[lower]
    }
    return ''
}

// Function to combine SSHConfig values into a single string. This is used to smash
// together the proxyCommand values which are split on whitespace and presented as
// an array of objects in the SSHConfig object
function convertSSHConfigValuesToString (arg: string | string[] | object[]): string {
    if (typeof arg === 'string') { return arg }
    let allStrings = true
    for (const item of arg) {
        if (typeof item !== 'string') {
            allStrings = false
            break
        }
    }
    if (allStrings) {
        return arg.join(' ')
    }

    // Have to explicitly unwrap the arg into a list of objects to avoid Typescript grumbles
    const objList: object[] = []
    for (const item of arg) {
        if ( typeof item === 'object' && 'val' in item ) {
            objList.push(item)
        }
    }
    return objList.filter(obj => 'val' in obj)
        .map(obj => 'val' in obj ? obj.val as string: '')
        .join(' ')
}

// Function to read in the SSH config file recursively and parse any Include directives
async function parseSSHConfigFile (
    filePath: string,
    visited = new Set<string>(),
): Promise<SSHConfig> {
    // If we've already processed this file, return an empty config to avoid infinite recursion
    if (visited.has(filePath)) {
        return SSHConfig.parse('')
    }
    visited.add(filePath)

    let raw = ''
    try {
        raw = await fs.readFile(filePath, 'utf8')
    } catch (err) {
        console.error(`Error reading SSH config file: ${filePath}`, err)
        return SSHConfig.parse('')
    }

    const parsed = SSHConfig.parse(raw)
    const merged = SSHConfig.parse('')
    for (const entry of parsed) {
        if (entry.type === LineType.DIRECTIVE && entry.param.toLowerCase() === 'include') {
            const directive = entry as Directive
            if (typeof directive.value !== 'string') {
                continue
            }

            // ssh_config(5) says "Files without absolute paths are assumed to be in ~/.ssh if included in a user configuration file or /etc/ssh if included from the system configuration file."
            let incPath = ''
            if (path.isAbsolute(directive.value)) {
                incPath = directive.value
            } else if (directive.value.startsWith('~')) {
                incPath = path.join(process.env.HOME ?? '~', directive.value.slice(1))
            } else {
                incPath = path.join(process.env.HOME ?? '~', '.ssh', directive.value)
            }

            const matches = glob.sync(incPath)
            for (const match of matches) {
                const stat = await fs.stat(match)
                if (stat.isDirectory()) {
                    continue
                }
                const matchedConfig = await parseSSHConfigFile(match, visited)
                merged.push(...matchedConfig)
            }
        } else {
            merged.push(entry)
        }
    }
    return merged
}

// Function to take an ssh-config entry and convert it into an SSHProfile
function convertHostToSSHProfile (host: string, settings: Record<string, string | string[] | object[] >): PartialProfile<SSHProfile> {

    // inline function to generate an id for this profile
    const deriveID = (name: string) => 'openssh-config:' + slugify(name)

    // Start point of the profile, with an ID, name, type and group
    const thisProfile: PartialProfile<SSHProfile> = {
        id: deriveID(host),
        name: `${host} (.ssh/config)`,
        type: 'ssh',
        group: 'Imported from .ssh/config',
    }
    const options = {}

    function convertToForwardedPortDescriptor (forwardType: PortForwardType.Local | PortForwardType.Remote | PortForwardType.Dynamic, details: string): ForwardedPortConfig {
        const detailsParts = details.split(/\s/)
        const bindParts = detailsParts[0].trim().split(':')
        if (bindParts.length === 1) {
            bindParts.unshift('127.0.0.1')
        }
        let tgtParts = ['', '22']
        if ( detailsParts.length > 1 ) {
            tgtParts = detailsParts[1].trim().split(':')
        }
        return {
            host: bindParts[0],
            port: parseInt(bindParts[1]),
            targetAddress: tgtParts[0],
            targetPort: parseInt(tgtParts[1]),
            type: forwardType,
            description: details,
        }
    }

    // for each ssh-config key in turn...
    for (const key in settings) {
        // decode a target attribute and an action
        const targetName = decodeTarget(key)

        switch (targetName) {

            // The following have single string values
            case SSHProfilePropertyNames.User:
            case SSHProfilePropertyNames.Host:
            case SSHProfilePropertyNames.JumpHost:
                const basicString = settings[key]
                if (typeof basicString === 'string') {
                    if (targetName === SSHProfilePropertyNames.JumpHost) {
                        options[targetName] = deriveID(basicString)
                    } else {
                        options[targetName] = basicString
                    }
                } else {
                    console.log('Unexpected value in settings for ' + key)
                }
                break

            // The following have single integer values
            case SSHProfilePropertyNames.Port:
            case SSHProfilePropertyNames.KeepaliveInterval:
            case SSHProfilePropertyNames.KeepaliveCountMax:
            case SSHProfilePropertyNames.ReadyTimeout:
                const numberString = settings[key]
                if (typeof numberString === 'string') {
                    options[targetName] = parseInt(numberString, 10)
                } else {
                    console.log('Unexpected value in settings for ' + key)
                }
                break

            // The following have single yes/no values
            case SSHProfilePropertyNames.X11:
            case SSHProfilePropertyNames.AgentForward:
                let booleanString = settings[key]
                booleanString = typeof booleanString === 'string' ? booleanString.toLowerCase() : ''
                if ( booleanString === 'yes' || booleanString === 'no' ) {
                    options[targetName] = booleanString === 'yes'
                } else {
                    console.log('Unexpected value in settings for ' + key)
                }
                break

            // ProxyCommand will be an array if unquoted and containing multiple words,
            // or a simple string otherwise
            case SSHProfilePropertyNames.ProxyCommand:
                const proxyCommand = convertSSHConfigValuesToString(settings[key])
                options[targetName] = proxyCommand
                break

            // IdentityFile may have multiple values and the need to have '~' converted to the
            // path to the HOME directory
            case SSHProfilePropertyNames.PrivateKeys:
                const processedKeys: string [] = (settings[key] as string[]).map( s => {
                    let retVal: string = s
                    if (s.startsWith('~/')) {
                        retVal = path.join(process.env.HOME ?? '~', s.slice(2))
                    }
                    return retVal
                })
                options[targetName] = processedKeys
                break

            // The port forwarding directives all end up in the same space, but with a different value
            // in the SSHProfileOptions object
            case SSHProfilePropertyNames.ForwardedPorts:
                const forwardTypeString = key.toLowerCase()
                let forwardType: PortForwardType | null = null
                switch (forwardTypeString) {
                    case 'localforward':
                        forwardType = PortForwardType.Local
                        break
                    case 'remoteforward':
                        forwardType = PortForwardType.Remote
                        break
                    case 'dynamicforward':
                        forwardType = PortForwardType.Dynamic
                        break
                }
                if (forwardType) {
                    options[targetName] ??= []
                    for (const forwarderDetails of settings[key]) {
                        if (typeof forwarderDetails === 'string') {
                            options[targetName].push(convertToForwardedPortDescriptor(forwardType, forwarderDetails))
                        }
                    }
                }
                break

        }

    }
    thisProfile.options = options
    return thisProfile
}

function convertToSSHProfiles (config: SSHConfig): PartialProfile<SSHProfile>[] {
    const myMap = new Map<string, PartialProfile<SSHProfile>>()

    function noWildCardsInName (name: string) {
        return !/[?*]/.test(name)
    }

    for (const entry of config) {
        // Each entry represents a line in the SSH Config. If the line is a 'Host' line,
        // then it will also contain the configuration for that identifiable Host.
        // There may be more than one host per line and some 'Hosts' have wildcards in their
        // names
        // If this is a genuine entry rather than a Comment...
        // ... and there is a 'Host' Parameter
        if (entry.type === LineType.DIRECTIVE && entry.param === 'Host') {

            // for each Name in this entry
            const hostList: string[] = []
            // if there is more than one host specified on this line, then the names will be
            // in an array
            if (typeof entry.value === 'string') {
                hostList.push(entry.value)
            } else if (Array.isArray(entry.value)) {
                for (const item of entry.value) {
                    hostList.push(item.val)
                }
            }
            // for each Host identified on this line, check that there are no wildcards in the
            // name and that we've not seen the name before.
            // If that is the case, then get the full configuration for this name.
            // If that has a 'Hostname' property (if that's missing, the name is not usable
            // for our purposes) then convert the configuration into an SSHProfile and stash it
            for (const host of hostList) {
                if (noWildCardsInName(host)) {
                    if (!(host in myMap)) {
                        // NOTE: SSHConfig.compute() lies about the return types
                        const configuration: Record<string, string | string[] | object[]> = config.compute(host)
                        if (Object.keys(configuration).map(key => key.toLowerCase()).includes('hostname')) {
                            myMap[host] = convertHostToSSHProfile(host, configuration)
                        }
                    }
                }
            }
        }
    }
    // Convert the values from the map into a list of Partial SSHProfiles sorted
    // by Hostname
    return Object.keys(myMap).sort().map(key => myMap[key])
}


@Injectable({ providedIn: 'root' })
export class OpenSSHImporter extends SSHProfileImporter {
    async getProfiles (): Promise<PartialProfile<SSHProfile>[]> {

        const configPath = path.join(process.env.HOME ?? '~', '.ssh', 'config')

        try {
            const config: SSHConfig = await parseSSHConfigFile(configPath)
            return convertToSSHProfiles(config)
        } catch (e) {
            if (e.code === 'ENOENT') {
                return []
            }
            throw e
        }
    }
}

@Injectable({ providedIn: 'root' })
export class StaticFileImporter extends SSHProfileImporter {
    private configPath: string

    constructor (
        electron: ElectronService,
    ) {
        super()
        this.configPath = path.join(electron.app.getPath('userData'), 'ssh-profiles.yaml')
    }

    async getProfiles (): Promise<PartialProfile<SSHProfile>[]> {
        const deriveID = name => 'file-config:' + slugify(name)

        if (!fsSync.existsSync(this.configPath)) {
            return []
        }

        const content = await fs.readFile(this.configPath, 'utf8')
        if (!content) {
            return []
        }

        return (yaml.load(content) as PartialProfile<SSHProfile>[]).map(item => ({
            ...item,
            id: deriveID(item.name),
            type: 'ssh',
        }))
    }
}


@Injectable({ providedIn: 'root' })
export class PrivateKeyLocator extends AutoPrivateKeyLocator {
    async getKeys (): Promise<[string, Buffer][]> {
        const results: [string, Buffer][] = []
        const keysPath = path.join(process.env.HOME!, '.ssh')
        if (!fsSync.existsSync(keysPath)) {
            return results
        }
        for (const file of await fs.readdir(keysPath)) {
            if (/^id_[\w\d]+$/.test(file)) {
                const privateKeyContents = await fs.readFile(
                    path.join(keysPath, file),
                    { encoding: null },
                )
                results.push([file, privateKeyContents])
            }
        }
        return results
    }
}
