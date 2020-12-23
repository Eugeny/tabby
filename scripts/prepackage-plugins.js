#!/usr/bin/env node
const rebuild = require('electron-rebuild').default
const sh = require('shelljs')
const path = require('path')
const fs = require('fs')
const vars = require('./vars')
const log = require('npmlog')

const localBinPath = path.resolve(__dirname, '../node_modules/.bin');
const npx = `${localBinPath}/npx`;

let target = path.resolve(__dirname, '../builtin-plugins')
sh.mkdir('-p', target)
fs.writeFileSync(path.join(target, 'package.json'), '{}')
sh.cd(target)
vars.builtinPlugins.forEach(plugin => {
  log.info('install', plugin)
  sh.cp('-r', path.join('..', plugin), '.')
  sh.rm('-rf', path.join(plugin, 'node_modules'))
  sh.cd(plugin)
  //sh.exec(`npm install --only=prod`)
  sh.exec(`${npx} yarn install --force`)

  
  log.info('rebuild', 'native')
  if (fs.existsSync('node_modules')) {
    rebuild(path.resolve('.'), vars.electronVersion, process.arch, [], true)
  }
  sh.cd('..')
})
fs.unlinkSync(path.join(target, 'package.json'), '{}')
