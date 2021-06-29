#!/usr/bin/env node
const rebuild = require('electron-rebuild').default
const sh = require('shelljs')
const path = require('path')
const fs = require('fs')
const vars = require('./vars')
const log = require('npmlog')

let target = path.resolve(__dirname, '../builtin-plugins')
sh.mkdir('-p', target)
fs.writeFileSync(path.join(target, 'package.json'), '{}')
sh.cd(target)
vars.builtinPlugins.forEach(plugin => {
  if (plugin === 'tabby-web') {
    return
  }
  log.info('install', plugin)
  sh.cp('-r', path.join('..', plugin), '.')
  sh.rm('-rf', path.join(plugin, 'node_modules'))
  sh.cd(plugin)
  sh.exec(`yarn install --force --production`)


  log.info('rebuild', 'native')
  if (fs.existsSync('node_modules')) {
    rebuild({
      buildPath: path.resolve('.'),
      electronVersion: vars.electronVersion,
      arch: process.env.ARCH ?? process.arch,
      force: true,
    })
  }
  sh.cd('..')
})
fs.unlinkSync(path.join(target, 'package.json'), '{}')
