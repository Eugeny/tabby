const log = require('npmlog')
const { builtinPlugins } = require('./scripts/vars')

const paths = [
    './app/webpack.config.js',
    './app/webpack.main.config.js',
    './web/webpack.config.js',
    './tabby-web-demo/webpack.config.js',
    ...builtinPlugins.map(x => `./${x}/webpack.config.js`),
]

paths.forEach(x => log.info(`Using config: ${x}`))

module.exports = paths.map(x => require(x))
