import * as path from 'path'
const __dirname = path.dirname(new URL(import.meta.url).pathname)
import config from '../webpack.plugin.config.mjs'

export default () => config({
    name: 'ssh',
    dirname: __dirname,
    alias: {
        'cpu-features': false,
        './crypto/build/Release/sshcrypto.node': false,
        '../build/Release/cpufeatures.node': false,
    },
})
