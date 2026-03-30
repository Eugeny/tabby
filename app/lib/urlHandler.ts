import { createParserConfig } from './cli'
import { parse as parseShellCommand } from 'shell-quote'

export function isTabbyURL (arg: string): boolean {
    return arg.toLowerCase().startsWith('tabby://')
}

export function parseTabbyURL (url: string, cwd: string = process.cwd()): any {
    try {
        if (!isTabbyURL(url)) {
            return null
        }

        // NOTE: the url host may be lowercased (xdg-open), need to use the original command
        const urlInstance = new URL(url)
        const command = urlInstance.host || urlInstance.pathname.replace(/^\/+/, '')
        const config = createParserConfig(cwd)
        const commandConfig = config.commands.find(cmd => {
            const primaryCommand = Array.isArray(cmd.command) ? cmd.command[0] : cmd.command
            return command.toLowerCase() === primaryCommand.split(/\s+/)[0].toLowerCase()
        })
        if (!commandConfig) {
            console.error(`Unknown command in tabby:// URL: ${command}`)
            return null
        }
        const primaryCommand = Array.isArray(commandConfig.command) ? commandConfig.command[0] : commandConfig.command
        const actualCommand = primaryCommand.split(/\s+/)[0]
        const argv: any = {
            _: [actualCommand],
        }
        for (const [key, value] of urlInstance.searchParams.entries()) {
            let parsedValue: any = value
            const optionConfig = commandConfig.options?.[key] ?? commandConfig.positionals?.[key]
            if (optionConfig) {
                switch (optionConfig.type) {
                    case 'boolean':
                        parsedValue = value === 'true' || value === ''
                        break
                    case 'number':
                        parsedValue = parseInt(value, 10)
                        break
                    case 'array':
                        parsedValue = parseShellCommand(value).filter(item => typeof item === 'string')
                        break
                    case 'string':
                    default:
                        parsedValue = value
                        break
                }
            } else {
                parsedValue = value
            }
            argv[key] = parsedValue
        }

        console.log(`URL Handler - Safely parsed [${url}] to:`, JSON.stringify(argv))
        return argv
    } catch (e) {
        console.error('Failed to parse tabby:// URL:', e)
        return null
    }
}
