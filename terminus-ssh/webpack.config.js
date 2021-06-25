const config = require('../webpack.plugin.config')
module.exports = config({
    name: 'ssh',
    dirname: __dirname,
    alias: {
        'cpu-features': false,
        './crypto/build/Release/sshcrypto.node': false,
        '../build/Release/cpufeatures.node': false,
    },
})
