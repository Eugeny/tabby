const config = require('../webpack.plugin.config')
module.exports = config({
    name: 'community-color-schemes',
    dirname: __dirname,
})
module.exports.module.rules.push({ test: /[\\\/]schemes[\\\/]/, use: 'raw-loader' })
