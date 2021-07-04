#!/usr/bin/env node
const sh = require('shelljs')
const vars = require('./vars')
const log = require('npmlog')
const webpack = require('webpack')
const { promisify } = require('util')

const configs = [
    '../app/webpack.main.config.js',
    '../app/webpack.config.js',
    '../web/webpack.config.js',
    ...vars.builtinPlugins.map(x => `../${x}/webpack.config.js`),
]

;(async () => {
    for (const c of configs) {
        log.info('build', c)
        await promisify(webpack)(require(c))
    }
})()
