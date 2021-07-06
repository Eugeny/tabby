const config = require('../webpack.plugin.config')
module.exports = config({
    name: 'terminal',
    dirname: __dirname,
    externals: [
        'hterm-umdjs',
        'opentype.js',
    ],
})
module.exports.resolve.modules.push('node_modules/xterm/src')
