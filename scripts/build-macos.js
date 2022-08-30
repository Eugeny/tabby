#!/usr/bin/env node
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
const builder = require('electron-builder').build
const vars = require('./vars')

const isTag = (process.env.GITHUB_REF || '').startsWith('refs/tags/')

process.env.ARCH = process.env.ARCH || process.arch

if (process.env.GITHUB_HEAD_REF) {
    delete process.env.CSC_LINK
    delete process.env.CSC_KEY_PASSWORD
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
}

builder({
    dir: true,
    mac: ['pkg', 'zip'],
    arm64: process.env.ARCH === 'arm64',
    config: {
        extraMetadata: {
            version: vars.version,
        },
        mac: {
            identity: !process.env.CI || process.env.CSC_LINK ? undefined : null,
        },
        npmRebuild: process.env.ARCH !== 'arm64',
        publish: process.env.GH_TOKEN || process.env.GITHUB_TOKEN ? {
            provider: 'github',
            channel: `latest-${process.env.ARCH}`,
        } : undefined,
    },
     publish: ( process.env.GH_TOKEN || process.env.GITHUB_TOKEN ) ? ( isTag ? 'always' : 'onTagOrDraft' ) : 'never',
}).catch(e => {
    console.error(e)
    process.exit(1)
})
