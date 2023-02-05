import * as path from 'path'
const __dirname = path.dirname(new URL(import.meta.url).pathname)
import config from '../webpack.plugin.config.mjs'

export default () => config({
    name: 'local',
    dirname: __dirname,
})
