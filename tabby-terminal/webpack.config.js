const config = require('../webpack.plugin.config')
module.exports = config({
    name: 'terminal',
    dirname: __dirname,
    externals: [
        'opentype.js',
    ],
    rules: [
        {
            test: /lib[\\/]xterm-addon-image-worker.js$/i,
            type: 'asset/source',
        },
    ],
})
module.exports.resolve.modules.push('node_modules/xterm/src')
