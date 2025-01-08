#!/usr/bin/env node
import sh from 'shelljs'
import * as vars from './vars.mjs'
import log from 'npmlog'

log.info('patch')
sh.exec(`yarn patch-package`, { fatal: true })

log.info('deps', 'app')

sh.cd('app')
sh.exec(`yarn install --force --network-timeout 1000000`, { fatal: true })
// Some native packages might fail to build before patch-package gets a chance to run via postinstall
sh.exec(`yarn postinstall`, { fatal: false })
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
