import * as path from 'path'
import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

import config from '../webpack.plugin.config.mjs'

export default () => {
    const cfg = config({
        name: 'community-color-schemes',
        dirname: __dirname,
    })
    cfg.module.rules.push({ test: /[\\\/]schemes[\\\/]/, use: 'raw-loader' })
    return cfg
}
