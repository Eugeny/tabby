#!/usr/bin/env node
const rebuild = require('electron-rebuild').default
const path = require('path')
const vars = require('./vars')

let buildPath = path.resolve(__dirname, '../terminus-terminal')
rebuild(buildPath, vars.electronVersion, process.arch, [], true).then(() => {
  console.log('Done')
})
