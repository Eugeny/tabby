import * as fs from 'fs/promises'
import * as glob from 'glob'
import * as path from 'path'

import SSHConfig, { Directive, LineType } from 'ssh-config'


// From ../src/sshImporters.ts
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

const test = async () => {
    const result = await parseSSHConfigFile(path.join(process.env.HOME ?? '~', '.ssh', 'config'))
    const expected =
`Host example2.com
  HostName 1.2.3.4
# Handle invalid format
ABCDEFG
  abcdefg
# No cyclic include
Host no-cyclic.example.com
  HostName 1.2.3.4
# Absolute PATH
Host test.absolute.path.example.com
  HostName 1.2.3.4
# Recurse
Host recursive.example.com
  HostName 1.2.3.4
# Not include same file twice
# Handle not Found
# No overwrite
Host twice.example.com
  HostName 1.2.3.4

# Handle Include in block
Host in-block.example.com
  Include in-block.conf
`
    console.log(result.toString() === expected)
}
test()
