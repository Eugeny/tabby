#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

const isTag = (process.env.GITHUB_REF || '').startsWith('refs/tags/')
const isCI = !!process.env.GITHUB_REF

builder({
    dir: true,
    mac: ['pkg', 'zip'],
    config: {
        publish: isTag ? [
            { provider: 'bintray', component: 'main' },
            { provider: 'github' },
        ] : [
            { provider: 'bintray', component: 'nightly' },
        ],
        extraMetadata: {
            version: vars.version,
        },
    },
    publish: isCI ? 'always' : 'onTag',
}).catch(() => process.exit(1))
