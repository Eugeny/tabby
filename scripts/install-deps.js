#!/usr/bin/env node
const sh = require('shelljs')
const path = require('path')
const vars = require('./vars')
const log = require('npmlog')

const localBinPath = path.resolve(__dirname, '../node_modules/.bin')
const npx = `${localBinPath}/npx`

log.info('patch')
sh.exec(`${npx} patch-package`)

log.info('deps', 'app')

sh.cd('app')
sh.exec(`${npx} yarn install --force`)
sh.cd('..')

sh.cd('web')
sh.exec(`${npx} yarn install --force`)
sh.cd('..')

vars.allPackages.forEach(plugin => {
    log.info('deps', plugin)
    sh.cd(plugin)
    sh.exec(`${npx} yarn install --force`)
    sh.cd('..')
})

if (['darwin', 'linux'].includes(process.platform)) {
    sh.cd('node_modules')
    for (let x of vars.builtinPlugins) {
        sh.ln('-fs', '../' + x, x)
    }
    sh.cd('..')
}
