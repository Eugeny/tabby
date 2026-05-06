import { dialog } from 'electron'
import { createParserConfig } from './cli'
import { parse as parseShellCommand } from 'shell-quote'

// Commands that may execute arbitrary shell code or inject input into a
// running terminal. These must not be triggered silently from a tabby:// URL
// (which can be invoked by any web page, document, or chat message) and
// instead require explicit, per-invocation user confirmation.
const URL_COMMANDS_REQUIRING_CONFIRMATION = new Set(['run', 'paste'])

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

        if (URL_COMMANDS_REQUIRING_CONFIRMATION.has(actualCommand)) {
            if (!confirmDangerousURLCommand(url, actualCommand, argv)) {
                console.warn(`URL Handler - User declined to execute ${actualCommand} from URL: ${url}`)
                return null
            }
        }

        console.log(`URL Handler - Safely parsed [${url}] to:`, JSON.stringify(argv))
        return argv
    } catch (e) {
        console.error('Failed to parse tabby:// URL:', e)
        return null
    }
}

function confirmDangerousURLCommand (url: string, command: string, argv: any): boolean {
    let detail: string
    if (command === 'run') {
        const parts = Array.isArray(argv.command) ? argv.command : []
        detail = parts.length ? parts.join(' ') : '(empty)'
    } else if (command === 'paste') {
        detail = typeof argv.text === 'string' ? argv.text : '(empty)'
    } else {
        detail = JSON.stringify(argv)
    }

    // Truncate to keep the dialog readable while still showing intent.
    const MAX_DETAIL = 1000
    if (detail.length > MAX_DETAIL) {
        detail = detail.slice(0, MAX_DETAIL) + '\u2026'
    }

    const result = dialog.showMessageBoxSync({
        type: 'warning',
        buttons: ['Cancel', 'Run'],
        defaultId: 0,
        cancelId: 0,
        title: 'Tabby: external command requested',
        message: `An external link is asking Tabby to "${command}" the following:`,
        detail: `${detail}\n\nSource URL:\n${url}\n\nOnly allow this if you trust the source. Tabby will execute the command in your terminal as if you typed it yourself.`,
        noLink: true,
    })
    return result === 1
}
