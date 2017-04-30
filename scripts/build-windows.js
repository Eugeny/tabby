#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

builder({
  dir: true,
  win: ['squirrel'],
  extraMetadata: {
    version: vars.version,
  },
})
