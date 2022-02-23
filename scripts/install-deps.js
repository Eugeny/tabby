#!/usr/bin/env node
const sh = require('shelljs')
const vars = require('./vars')
const log = require('npmlog')

log.info('patch')
sh.exec(`yarn patch-package`, { fatal: true })

log.info('deps', 'app')

sh.cd('app')
sh.exec(`yarn install --force --network-timeout 1000000`, { fatal: true })
sh.cd('..')

sh.cd('web')
sh.exec(`yarn install --force --network-timeout 1000000`, { fatal: true })
sh.exec(`yarn patch-package`, { fatal: true })
sh.cd('..')

vars.allPackages.forEach(plugin => {
    log.info('deps', plugin)
    sh.cd(plugin)
    sh.exec(`yarn install --force --network-timeout 1000000`, { fatal: true })
    sh.cd('..')
})

if (['darwin', 'linux'].includes(process.platform)) {
    sh.cd('node_modules')
    for (let x of vars.builtinPlugins) {
        sh.ln('-fs', '../' + x, x)
    }
    sh.cd('..')
}
