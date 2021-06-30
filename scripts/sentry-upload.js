#!/usr/bin/env node
const sh = require('shelljs')
const vars = require('./vars')

const sentryCli = process.platform === 'win32' ? 'node_modules\\.bin\\sentry-cli.cmd' : 'sentry-cli'

sh.exec(`${sentryCli} releases new ${vars.version}`)

if (process.platform === 'darwin') {
    for (const path of [
        'app/node_modules/@serialport/bindings/build/Release/bindings.node',
        'app/node_modules/node-pty/build/Release/pty.node',
        'app/node_modules/fontmanager-redux/build/Release/fontmanager.node',
        'app/node_modules/macos-native-processlist/build/Release/native.node',
    ]) {
        sh.exec('dsymutil ' + path)
    }
}

sh.exec(`${sentryCli} upload-dif app/node_modules`)
sh.exec(`${sentryCli} releases set-commits --auto ${vars.version}`)
for (const p of vars.builtinPlugins) {
    sh.exec(`${sentryCli} releases files ${vars.version} upload-sourcemaps ${p}/dist -u ${p}/dist/ -d ${process.platform}-${p}`)
}
