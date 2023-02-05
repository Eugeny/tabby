import * as path from 'path'
const __dirname = path.dirname(new URL(import.meta.url).pathname)
import config from '../webpack.plugin.config.mjs'

export default () => {
    const cfg = config({
        name: 'community-color-schemes',
        dirname: __dirname,
    })
    cfg.module.rules.push({ test: /[\\\/]schemes[\\\/]/, use: 'raw-loader' })
    return cfg
}
