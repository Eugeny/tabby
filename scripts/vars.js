const path = require('path')
const fs = require('fs')
const semver = require('semver')
const childProcess = require('child_process')

const electronInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../node_modules/electron/package.json')))

exports.version = childProcess.execSync('git describe --tags', { encoding:'utf-8' })
exports.version = exports.version.substring(1).trim()
exports.version = exports.version.replace('-', '-c')

if (exports.version.includes('-c')) {
    exports.version = semver.inc(exports.version, 'prepatch').replace('-0', `-nightly.${process.env.REV ?? 0}`)
}

exports.builtinPlugins = [
    'tabby-core',
    'tabby-settings',
    'tabby-terminal',
    'tabby-local',
    'tabby-web',
    'tabby-community-color-schemes',
    'tabby-plugin-manager',
    'tabby-ssh',
    'tabby-serial',
    'tabby-telnet',
    'tabby-electron',
]

exports.allPackages = [
    ...exports.builtinPlugins,
    'web',
    'tabby-web-demo',
]

exports.bundledModules = [
    '@angular',
    '@ng-bootstrap',
]
exports.electronVersion = electronInfo.version
