#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

builder({
  dir: true,
  linux: ['snap', 'deb', 'rpm', 'tar.gz'],
  config: {
    extraMetadata: {
      version: vars.version,
    },
  },
  publish: 'onTag',
}).catch(() => process.exit(1))
