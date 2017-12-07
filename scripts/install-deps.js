#!/usr/bin/env node
const sh = require('shelljs')
const path = require('path')
const vars = require('./vars')
const log = require('npmlog')

const localBinPath = path.resolve(__dirname, '../node_modules/.bin');
const npx = `${localBinPath}/npx`;

log.info('deps', 'app')
sh.exec(`${npx} yarn install`)

sh.cd('app')
sh.exec(`${npx} yarn install`)
sh.cd('..')

vars.builtinPlugins.forEach(plugin => {
  log.info('deps', plugin)
  sh.cd(plugin)
  sh.exec(`${npx} yarn install`)
  sh.cd('..')
})
