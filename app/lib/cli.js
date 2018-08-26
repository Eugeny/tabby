import { app } from 'electron'

export function parseArgs (argv, cwd) {
  if (argv[0].includes('node')) {
    argv = argv.slice(1)
  }

  return require('yargs')
    .usage('terminus [command] [arguments]')
    .command('open [directory]', 'open a shell in a directory', {
      directory: { type: 'string', 'default': cwd },
    })
    .command('run [command...]', 'run a command in the terminal', {
      command: { type: 'string' },
    })
    .version('v', 'Show version and exit', app.getVersion())
    .alias('d', 'debug')
    .describe('d', 'Show DevTools on start')
    .alias('h', 'help')
    .help('h')
    .strict()
    .parse(argv.slice(1))
}
