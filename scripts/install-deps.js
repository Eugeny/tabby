#!/usr/bin/env node
const sh = require('shelljs')
const path = require('path')
const vars = require('./vars')
const log = require('npmlog')

log.info('deps', 'app')
sh.exec('npm prune')
sh.exec('npm install')
sh.exec('npm update --dev')

sh.cd('app')
sh.exec('npm prune')
sh.exec('npm install')
sh.exec('npm update --dev')
sh.cd('..')

vars.builtinPlugins.forEach(plugin => {
  log.info('deps', plugin)
  sh.cd(plugin)
  sh.exec('npm prune')
  sh.exec('npm install')
  sh.exec('npm update --dev')
  sh.cd('..')
})
