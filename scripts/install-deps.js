#!/usr/bin/env node
const sh = require('shelljs')
const path = require('path')
const vars = require('./vars')

sh.exec('npm prune')
sh.exec('npm install')

vars.builtinPlugins.forEach(plugin => {
  sh.cd(plugin)
  sh.exec('npm prune')
  sh.exec('npm install')
  sh.cd('..')
})
