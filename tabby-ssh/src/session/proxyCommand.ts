import * as shellQuote from 'shell-quote'

export function parseProxyCommand (command: string, host: string, port: number|null|undefined): string[] {
    const argv = shellQuote.parse(command)
    if (!argv.every((value): value is string => typeof value === 'string')) {
        throw new Error('Proxy command contains shell operators, which are not supported')
    }
    if (!argv.length || !argv[0]) {
        throw new Error('Proxy command is empty')
    }
    const tokens: Record<string, string> = { '%h': host, '%p': String(port ?? 22), '%%': '%' }
    // Expand after parsing so a hostname cannot introduce additional arguments.
    return argv.map(arg => arg.replace(/%[%hp]/g, token => tokens[token]))
}
