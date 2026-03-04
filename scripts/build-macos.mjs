#!/usr/bin/env node
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { build as builder } from 'electron-builder'
import * as vars from './vars.mjs'
import { execFileSync } from 'child_process'
import * as path from 'path'

const isTag = (process.env.GITHUB_REF || '').startsWith('refs/tags/')

process.env.ARCH = process.env.ARCH || process.arch

if (process.env.GITHUB_HEAD_REF) {
    delete process.env.CSC_LINK
    delete process.env.CSC_KEY_PASSWORD
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
}

process.env.APPLE_ID ??= process.env.APPSTORE_USERNAME
process.env.APPLE_APP_SPECIFIC_PASSWORD ??= process.env.APPSTORE_PASSWORD

const wantsRealSigning = !!(process.env.CSC_LINK || process.env.CSC_NAME || process.env.APPLE_TEAM_ID)

async function main () {
    if (wantsRealSigning) {
        await builder({
            dir: true,
            mac: ['dmg', 'zip'],
            x64: process.env.ARCH === 'x86_64',
            arm64: process.env.ARCH === 'arm64',
            config: {
                extraMetadata: {
                    version: vars.version,
                    teamId: process.env.APPLE_TEAM_ID,
                },
                mac: {
                    notarize: false,
                },
                npmRebuild: process.env.ARCH !== 'arm64',
                publish: process.env.KEYGEN_TOKEN ? [
                    vars.keygenConfig,
                    {
                        provider: 'github',
                        channel: `latest-${process.env.ARCH}`,
                    },
                ] : undefined,
            },
            publish: (process.env.KEYGEN_TOKEN && isTag) ? 'always' : 'never',
        })
        return
    }

    await builder({
        dir: true,
        mac: ['dir'],
        x64: process.env.ARCH === 'x86_64',
        arm64: process.env.ARCH === 'arm64',
        config: {
            extraMetadata: {
                version: vars.version,
            },
            mac: {
                identity: null,
                hardenedRuntime: false,
                entitlements: null,
                entitlementsInherit: null,
                notarize: false,
            },
            npmRebuild: process.env.ARCH !== 'arm64',
            publish: undefined,
        },
        publish: 'never',
    })

    const appDir = path.join(process.cwd(), 'dist', process.env.ARCH === 'x86_64' ? 'mac' : `mac-${process.env.ARCH}`)
    const appPath = path.join(appDir, 'Tabby.app')

    execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
    execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' })

    await builder({
        prepackaged: appPath,
        mac: ['dmg', 'zip'],
        x64: process.env.ARCH === 'x86_64',
        arm64: process.env.ARCH === 'arm64',
        config: {
            extraMetadata: {
                version: vars.version,
            },
            mac: {
                identity: null,
                hardenedRuntime: false,
                entitlements: null,
                entitlementsInherit: null,
                notarize: false,
            },
            npmRebuild: false,
            publish: undefined,
        },
        publish: 'never',
    })
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
