#!/usr/bin/env node
const rebuild = require('electron-rebuild').default
const path = require('path')
const vars = require('./vars')

rebuild({
  buildPath: path.resolve(__dirname, '../terminus-ssh'),
  electronVersion: vars.electronVersion,
  force: true,
})
rebuild({
  buildPath: path.resolve(__dirname, '../terminus-terminal'),
  electronVersion: vars.electronVersion,
  force: true,
})
