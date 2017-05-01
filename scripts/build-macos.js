#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

builder({
  dir: true,
  mac: ['dmg'],
  extraMetadata: {
    version: vars.version,
  },
})
