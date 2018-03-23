const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')

const appInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app/package.json')))
const pkgInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json')))

exports.version = childProcess.execSync('git describe --tags', {encoding:'utf-8'})
exports.version = exports.version.substring(1, exports.version.length - 1)

exports.builtinPlugins = [
  'terminus-core',
  'terminus-settings',
  'terminus-terminal',
  'terminus-community-color-schemes',
  'terminus-plugin-manager',
  'terminus-ssh',
]
exports.bundledModules = [
  '@angular',
  '@ng-bootstrap',
]
exports.nativeModules = ['node-pty-tmp', 'font-manager', 'xkeychain']
exports.electronVersion = pkgInfo.devDependencies.electron
