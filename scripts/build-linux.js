#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

builder({
  dir: true,
  linux: ['deb', 'rpm', 'tar.gz'],
  extraMetadata: {
    version: vars.version,
  },
  publish: 'onTag',
  draft: false
})
