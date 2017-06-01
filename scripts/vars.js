const path = require('path')
const fs = require('fs')

const appInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app/package.json')))
const pkgInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json')))

exports.builtinPlugins = [
  'terminus-core',
  'terminus-settings',
  'terminus-terminal',
  'terminus-community-color-schemes',
]
exports.version = appInfo.version
exports.electronVersion = pkgInfo.devDependencies.electron
