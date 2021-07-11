#!/usr/bin/env node
const sh = require('shelljs')
const vars = require('./vars')
const log = require('npmlog')

vars.allPackages.forEach(plugin => {
    log.info('bump', plugin)
    sh.cd(plugin)
    sh.exec('npm --no-git-tag-version version ' + vars.version)
    sh.exec('npm publish')
    sh.cd('..')
})
