#!/usr/bin/env node
import * as vars from './vars.mjs'
import log from 'npmlog'
import webpack from 'webpack'
import { promisify } from 'node:util'

const configs = [
    '../app/webpack.config.main.mjs',
    '../app/webpack.config.mjs',
    ...vars.allPackages.map(x => `../${x}/webpack.config.mjs`),
]

;(async () => {
    for (const c of configs) {
        log.info('build', c)
        const stats = await promisify(webpack)((await import(c)).default())
        console.log(stats.toString({ colors: true }))
        if (stats.hasErrors()) {
            process.exit(1)
        }
    }
})()
