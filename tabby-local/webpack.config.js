const config = require('../webpack.plugin.config')
module.exports = config({
    name: 'local',
    dirname: __dirname,
})
