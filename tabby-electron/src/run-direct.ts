import SSHConfig, { LineType } from 'ssh-config'
import { readFileSync } from 'fs'
import { join } from 'path'
import os from 'os'
import { PartialProfile } from 'tabby-core'
import { SSHProfile } from 'tabby-ssh'
import slugify from 'slugify'


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

// Function to read in the SSH config file and return it as a string
function readSSHConfigFile (): string {
    // const filePath = join(os.homedir(), '.ssh', 'config')
    const filePath = join(os.homedir(), 'test-config.txt')
    try {
        return readFileSync(filePath, 'utf8')
    } catch (err) {
        console.error('Error reading SSH config file:', err)
        return ''
    }
}

// Data structure to map the (lowercase) ssh-config attributes (as keys) to a tuple
// containing the name of the corresponding SSHProfile attribute and an enum to
// determine the action required to process that field
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
}

// Function to use the above to return details corresponding to the supplied SSHProperty name
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
        if (typeof item === 'object') {
            objList.push(item)
        }
    }
    return objList.filter(obj => obj.val !== undefined)
        .map(obj => obj.val as string)
        .join(' ')
}

// Function to take an ssh-config entry and convert it into an SSHProfile
function convertToSSHProfile (host: string, settings: Record<string, string | string[] | object[] >): PartialProfile<SSHProfile> {

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

    function convertToForwardedPortDescriptor (forwardType: PortForwardType.Local | PortForwardType.Remote | PortForwardType.Dynamic, setting: string): ForwardedPortConfig {
        return {
            host: '',
            port: 0,
            targetAddress: '',
            targetPort: 0,
            type: forwardType,
            description: setting,
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
                    options[targetName] = basicString
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
                    if (s.startsWith('~/')) {
                        s = join(process.env.HOME ?? '~', s.slice(2))
                    }
                    return s
                })
                options[targetName] = processedKeys
                break

            // The port forwarding directives all end up in the same space, but with a different value
            // in the SSHProfileOptions object
            // case SSHProfilePropertyNames.ForwardedPorts:
            //     const forwardTypeString = key.toLowerCase()
            //     let forwardType: PortForwardType | null = null
            //     switch (forwardTypeString) {
            //         case 'localforward':
            //             forwardType = PortForwardType.Local
            //             break
            //         case 'remoteforward':
            //             forwardType = PortForwardType.Remote
            //             break
            //         case 'dynamicforward':
            //             forwardType = PortForwardType.Dynamic
            //             break
            //     }
            //     if (forwardType) {
            //         options[targetName] ??= []
            //         options[targetName].push(convertToForwardedPortDescriptor(forwardType, convertSSHConfigValuesToString(settings[key])))
            //     }
            //     break

        }

    }
    thisProfile.options = options
    return thisProfile
}


// Example usage
const sshConfigContent = readSSHConfigFile()

const config: SSHConfig = SSHConfig.parse(sshConfigContent)

const myMap = new Map<string, Record<string, string | string[]>>()

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
                    if (configuration['HostName']) {
                        myMap[host] = convertToSSHProfile(host, configuration)
                    }
                }
            }
        }
    }
}
// The original whitespaces and comments are preserved.
console.log(SSHConfig.stringify(config))
// console.log(config.toString())
