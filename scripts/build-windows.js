#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

const isTag = (process.env.GITHUB_REF || '').startsWith('refs/tags/')
const isCI = !!process.env.GITHUB_REF

builder({
    dir: true,
    win: ['nsis', 'portable'],
    config: {
        publish: isTag ? [
            { provider: 'bintray', 'package': 'terminus' },
            { provider: 'github' },
        ] : [
            { provider: 'bintray', 'package': 'terminus-nightly' },
        ],
        extraMetadata: {
            version: vars.version,
        },
    },
    publish: isCI ? 'always' : 'onTag',
}).catch(() => process.exit(1))
