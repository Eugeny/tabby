#!/usr/bin/env node
const rebuild = require('electron-rebuild').default
const path = require('path')
const vars = require('./vars')

lifecycles = []
lifecycles.push(rebuild({
  buildPath: path.resolve(__dirname, '../app'),
  electronVersion: vars.electronVersion,
  force: true,
}).lifecycle)
lifecycles.push(rebuild({
  buildPath: path.resolve(__dirname, '../terminus-ssh'),
  electronVersion: vars.electronVersion,
  force: true,
}).lifecycle)
lifecycles.push(rebuild({
  buildPath: path.resolve(__dirname, '../terminus-terminal'),
  electronVersion: vars.electronVersion,
  force: true,
}).lifecycle)

for (let lc of lifecycles) {
  lc.on('module-found', name => {
    console.info('Rebuilding', name)
  })
}
