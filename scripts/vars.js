const path = require('path')
const fs = require('fs')

const appInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app/package.json')))
const pkgInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json')))

exports.builtinPlugins = [
  'terminus-core',
  'terminus-settings',
  'terminus-terminal',
  'terminus-clickable-links',
  'terminus-community-color-schemes',
  'terminus-theme-hype',
]
exports.version = appInfo.version
exports.electronVersion = pkgInfo.devDependencies.electron
