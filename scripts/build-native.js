#!/usr/bin/env node
const rebuild = require('electron-rebuild').default
const path = require('path')
const vars = require('./vars')

lifecycles = []
for (let dir of ['app', 'terminus-core', 'terminus-ssh', 'terminus-terminal']) {
  build = rebuild({
    buildPath: path.resolve(__dirname, '../' + dir),
    electronVersion: vars.electronVersion,
    force: true,
  })
  build.catch(() => process.exit(1))
  lifecycles.push([build.lifecycle, dir])
}

console.info('Building against Electron', vars.electronVersion)

for (let [lc, dir] of lifecycles) {
  lc.on('module-found', name => {
    console.info('Rebuilding', dir + '/' + name)
  })
}
