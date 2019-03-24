#!/usr/bin/env node
const rebuild = require('electron-rebuild').default
const path = require('path')
const vars = require('./vars')

lifecycles = []
for (let dir of ['app', 'terminus-ssh', 'terminus-terminal']) {
  lifecycles.push([rebuild({
    buildPath: path.resolve(__dirname, '../' + dir),
    electronVersion: vars.electronVersion,
    force: true,
  }).lifecycle, dir])
}

console.info('Building against Electron', vars.electronVersion)

for (let [lc, dir] of lifecycles) {
  lc.on('module-found', name => {
    console.info('Rebuilding', dir + '/' + name)
  })
}
