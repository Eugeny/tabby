#!/usr/bin/env node
const rebuild = require('electron-rebuild').default
const builder = require('electron-builder').default
const sh = require('shelljs')
const path = require('path')
const fs = require('fs')
const vars = require('./vars')

let target = path.resolve(__dirname, '../builtin-plugins')

sh.mkdir('-p', target)
fs.writeFileSync(path.join(target, 'package.json'), '{}')
sh.cd(target)
vars.builtinPlugins.forEach(plugin => {
  sh.exec(`npm install ${path.join('..', plugin)}`)
})
sh.exec('npm dedupe')
sh.cd('..')
rebuild(target, vars.electronVersion, process.arch, ['node-pty', 'font-manager'], true)
