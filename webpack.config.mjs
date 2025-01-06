import log from 'npmlog'
import { builtinPlugins } from './scripts/vars.mjs'

const paths = [
    './app/webpack.config.mjs',
    './app/webpack.config.main.mjs',
    // './web/webpack.config.mjs',
    // './tabby-web-demo/webpack.config.mjs',
    ...builtinPlugins.map(x => `./${x}/webpack.config.mjs`),
]

paths.forEach(x => log.info(`Using config: ${x}`))

export default () => Promise.all(paths.map(x => import(x).then(x => x.default())))
