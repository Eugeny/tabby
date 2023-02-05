import * as path from 'path'
const __dirname = path.dirname(new URL(import.meta.url).pathname)
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
    cfg.resolve.modules.push('node_modules/xterm/src')
    return cfg
}
