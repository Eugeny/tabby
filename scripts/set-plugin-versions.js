#!/usr/bin/env node
const sh = require('shelljs')
const vars = require('./vars')
const log = require('npmlog')

vars.builtinPlugins.forEach(plugin => {
  log.info('bump', plugin)
  sh.cd(plugin)
  sh.exec('npm --no-git-tag-version version ' + vars.version)
  sh.cd('..')
})
