import { app } from 'electron'

export function parseArgs (argv: string[], cwd: string): any {
    if (argv[0].includes('node')) {
        argv = argv.slice(1)
    }

    return require('yargs/yargs')(argv.slice(1))
        .usage('tabby [command] [arguments]')
        .command('open [directory]', 'open a shell in a directory', {
            directory: { type: 'string', 'default': cwd },
        })
        .command(['run [command...]', '/k'], 'run a command in the terminal', {
            command: { type: 'string' },
        })
        .command('profile [profileName]', 'open a tab with specified profile', {
            profileName: { type: 'string' },
        })
        .command('paste [text]', 'paste stdin into the active tab', yargs => {
            return yargs.option('escape', {
                alias: 'e',
                type: 'boolean',
                describe: 'Perform shell escaping',
            }).positional('text', {
                type: 'string',
            })
        })
        .command('recent [index]', 'open a tab with a recent profile', {
            profileNumber: { type: 'number' },
        })
        .command('quickConnect <providerId> <query>', 'open a tab for specified quick connect provider', yargs => {
            return yargs.positional('providerId', {
                describe: 'The name of a quick connect profile provider',
                type: 'string',
                choices: ['ssh', 'telnet'],
            }).positional('query', {
                describe: 'The quick connect query string',
                type: 'string',
            })
        })
        .version(app.getVersion())
        .option('debug', {
            alias: 'd',
            describe: 'Show DevTools on start',
            type: 'boolean',
        })
        .option('hidden', {
            describe: 'Start minimized',
            type: 'boolean',
        })
        .help('help')
        .parse()
}
