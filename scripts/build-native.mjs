#!/usr/bin/env node
import { rebuild } from '@electron/rebuild'
import { execFileSync } from 'child_process'
import * as path from 'path'
import { copyFileSync, mkdirSync } from 'node:fs'
import * as vars from './vars.mjs'

import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))


if (process.platform === 'win32' || process.platform === 'linux') {
    process.env.ARCH = ((process.env.ARCH || process.arch) === 'arm') ? 'armv7l' : process.env.ARCH || process.arch
} else {
    process.env.ARCH ??= process.arch
}

let lifecycles = []
let builds = []
for (let dir of ['app', 'tabby-core', 'tabby-local', 'tabby-ssh', 'tabby-terminal']) {
    const build = rebuild({
        buildPath: path.resolve(__dirname, '../' + dir),
        electronVersion: vars.electronVersion,
        arch: process.env.ARCH,
        force: true,
    })
    build.catch(e => {
        console.error(e)
        process.exit(1)
    })
    builds.push(build)
    lifecycles.push([build.lifecycle, dir])
}

console.info('Building against Electron', vars.electronVersion)

for (let [lc, dir] of lifecycles) {
    lc.on('module-found', name => {
        console.info('Rebuilding', dir + '/' + name)
    })
}

await Promise.all(builds)

if (process.platform === 'win32') {
    execFileSync(process.execPath, [
        path.resolve(__dirname, '../node_modules/node-gyp/bin/node-gyp.js'),
        'rebuild', '--directory=' + path.resolve(__dirname, '../app/native'),
        '--target=' + vars.electronVersion, '--arch=' + process.env.ARCH,
        '--dist-url=https://www.electronjs.org/headers',
    ], { stdio: 'inherit' })
    mkdirSync(path.resolve(__dirname, '../app/dist'), { recursive: true })
    copyFileSync(path.resolve(__dirname, '../app/native/build/Release/wallpaper.node'),
        path.resolve(__dirname, '../app/dist/wallpaper.node'))

    // node-gyp's clean step just wiped node-pty's bundled conpty.dll + OpenConsole.exe out of
    // build/Release; node-pty's own postinstall puts them back for the arch we're targeting
    execFileSync(process.execPath, ['scripts/post-install.js'], {
        cwd: path.resolve(__dirname, '../app/node_modules/node-pty'),
        env: { ...process.env, npm_config_arch: process.env.ARCH },
        stdio: 'inherit',
    })
}
