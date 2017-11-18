#!/usr/bin/env node
const rebuild = require('electron-rebuild').default
const path = require('path')
const vars = require('./vars')

rebuild(path.resolve(__dirname, '../app'), vars.electronVersion, process.arch, [], true)
rebuild(path.resolve(__dirname, '../terminus-terminal'), vars.electronVersion, process.arch, [], true)
