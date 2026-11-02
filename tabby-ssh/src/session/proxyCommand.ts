import * as shellQuote from 'shell-quote'

export function parseProxyCommand (command: string, host: string, port: number|null|undefined, user?: string|null): string[] {
    // parse() yields operator objects for things like && or |, which newCommand
    // can't run - it spawns a single process, not a shell. Dropping them silently
    // would turn "a && b" into "a b", so refuse instead.
    const argv = shellQuote.parse(command)
    if (!argv.every((value): value is string => typeof value === 'string')) {
        throw new Error('Proxy command contains shell operators, which are not supported')
    }
    if (!argv.length || !argv[0]) {
        throw new Error('Proxy command is empty')
    }
    const trimmedHost = host.trim()
    const tokens: Record<string, string> = { '%h': trimmedHost, '%p': String(port ?? 22), '%r': user ?? '', '%%': '%' }
    // Expand after parsing so a hostname cannot introduce additional arguments.
    return argv.map(arg => arg.replace(/%[%hpr]/g, token => {
        if (token === '%h' && !trimmedHost) {
            throw new Error('Proxy command uses %h but the profile has no host')
        }
        return tokens[token]
    }))
}
