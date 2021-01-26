#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

const isTag = (process.env.GITHUB_REF || '').startsWith('refs/tags/')

process.env.ARCH = process.env.ARCH || process.arch

builder({
    dir: true,
    mac: ['pkg', 'zip'],
    arm64: process.env.ARCH === 'arm64',
    config: {
        extraMetadata: {
            version: vars.version,
        },
        npmRebuild: process.env.ARCH !== 'arm64',
    },
    publish: isTag ? 'always' : 'onTag',
}).catch(e => {
    console.error(e)
    process.exit(1)
})
