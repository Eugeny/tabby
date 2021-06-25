const config = require('../webpack.plugin.config')
module.exports = config({
    name: 'ssh',
    dirname: __dirname,
    externals: [
        './crypto/build/Release/sshcrypto.node',
        '../build/Release/cpufeatures.node',
    ],
})
