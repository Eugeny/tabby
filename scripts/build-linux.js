#!/usr/bin/env node
const builder = require('electron-builder').build
const vars = require('./vars')

const isTag = (process.env.BUILD_SOURCEBRANCH || '').startsWith('refs/tags/')

builder({
    dir: true,
    linux: ['snap', 'deb', 'rpm', 'tar.gz'],
    config: {
        extraMetadata: {
            version: vars.version,
        },
    },
    publish: isTag ? 'always' : 'onTag',
}).catch(() => process.exit(1))
