#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')
const fs = require('fs')
const signHook = require('../build/mac/afterSignHook')

const isTag = (process.env.GITHUB_REF || '').startsWith('refs/tags/')

builder({
    dir: true,
    mac: ['pkg', 'zip'],
    config: {
        extraMetadata: {
            version: vars.version,
        },
    },
    publish: isTag ? 'always' : 'onTag',
}).catch(e => {
    console.error(e)
    process.exit(1)
})
