#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

builder({
  dir: true,
  linux: ['deb'],
  extraMetadata: {
    version: vars.version,
  },
})
