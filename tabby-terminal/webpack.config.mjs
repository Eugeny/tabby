import * as path from 'path'
import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

import config from '../webpack.plugin.config.mjs'

export default () => {
    const cfg = config({
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
    return cfg
}
