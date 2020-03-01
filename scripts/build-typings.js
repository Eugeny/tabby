#!/usr/bin/env node
const sh = require('shelljs')
const vars = require('./vars')
const log = require('npmlog')

vars.builtinPlugins.forEach(plugin => {
    log.info('typings', plugin)
    sh.exec(`npx tsc --project ${plugin}/tsconfig.typings.json`)
})
