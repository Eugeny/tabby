#!/usr/bin/env node
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
const builder = require('electron-builder').build
const vars = require('./vars')

const isTag = (process.env.GITHUB_REF || '').startsWith('refs/tags/')

process.env.ARCH = (process.env.ARCH || process.arch) === 'arm' ? 'armv7l' : process.env.ARCH || process.arch

builder({
    dir: true,
    linux: ['deb', 'tar.gz', 'rpm', 'pacman'],
    armv7l: process.env.ARCH === 'armv7l',
    arm64: process.env.ARCH === 'arm64',
    config: {
        extraMetadata: {
            version: vars.version,
        },
        publish: {
            provider: 'github',
            channel: `latest-${process.arch}`,
        },
    },
    publish: isTag ? 'always' : 'onTagOrDraft',
}).catch(() => process.exit(1))
