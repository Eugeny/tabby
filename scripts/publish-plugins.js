#!/usr/bin/env node
const sh = require('shelljs')
const vars = require('./vars')
const log = require('npmlog')

;[...vars.builtinPlugins, 'web', 'tabby-web-demo'].forEach(plugin => {
    log.info('bump', plugin)
    sh.cd(plugin)
    sh.exec('npm --no-git-tag-version version ' + vars.version)
    sh.exec('npm publish')
    sh.cd('..')
})
