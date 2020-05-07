const fs = require('fs')
const signHook = require('./afterSignHook')

module.exports = async function (params) {
    // notarize the app on Mac OS only.
    if (process.platform !== 'darwin' || !process.env.GITHUB_REF || !process.env.GITHUB_REF.startsWith('refs/tags/')) {
        return
    }
    console.log('afterBuild hook triggered')

    let pkgName = fs.readdirSync('dist').find(x => x.endsWith('.pkg'))
    signHook({
        appOutDir: 'dist',
        _pathOverride: pkgName,
    })
}
