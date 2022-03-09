#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

const isTag = (process.env.GITHUB_REF || process.env.BUILD_SOURCEBRANCH || '').startsWith('refs/tags/')
const isCI = !!process.env.GITHUB_REF

process.env.ARCH = process.env.ARCH || process.arch

builder({
    dir: true,
    win: ['nsis', 'zip'],
    arm64: process.env.ARCH === 'arm64',
    config: {
        extraMetadata: {
            version: vars.version,
        },
    },
    publish: isTag ? 'always' : 'onTag',
}).catch(() => process.exit(1))
