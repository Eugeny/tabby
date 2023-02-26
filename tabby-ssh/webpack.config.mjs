import * as path from 'path'
import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

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
