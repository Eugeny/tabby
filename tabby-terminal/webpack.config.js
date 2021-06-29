const path = require('path')
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
module.exports.module.rules.find(x => x.use.loader === 'awesome-typescript-loader').use.options.paths['*'].push(path.resolve(__dirname, './node_modules/xterm/src/*'))
