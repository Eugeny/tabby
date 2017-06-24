#!/usr/bin/env node
const sh = require('shelljs')
const vars = require('./vars')
const log = require('npmlog')

vars.builtinPlugins.forEach(plugin => {
  log.info('build', plugin)
  sh.cd(plugin)
  sh.exec(`npm run build`)
  sh.cd('..')
})
