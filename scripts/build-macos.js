#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

builder({
  dir: true,
  mac: ['dmg', 'zip'],
  config: {
    extraMetadata: {
      version: vars.version,
    },
  },
  publish: 'onTag',
}).catch(() => process.exit(1))
