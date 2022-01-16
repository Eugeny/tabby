#!/usr/bin/env node
const sh = require('shelljs')
const vars = require('./vars')
const log = require('npmlog')
const { execSync } = require('child_process')

vars.allPackages.forEach(plugin => {
    log.info('bump', plugin)
    sh.cd(plugin)
    sh.exec('npm --no-git-tag-version version ' + vars.version, { fatal: true })
    execSync('npm publish', { stdio: 'inherit' })
    sh.cd('..')
})
