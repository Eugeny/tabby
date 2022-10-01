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
        publish: process.env.KEYGEN_TOKEN ? {
            product: {
                arm64: '98fbadee-c707-4cd6-9d99-56683595a846',
                x86_64: 'f5a48841-d5b8-4b7b-aaa7-cf5bffd36461',
            }[process.env.ARCH],
            ...vars.keygenConfig,
        } : undefined,
    },
    publish: process.env.KEYGEN_TOKEN ? isTag ? 'always' : 'onTagOrDraft' : 'never',
}).catch(e => {
    console.error(e)
    process.exit(1)
})
