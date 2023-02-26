#!/usr/bin/env node
import sh from 'shelljs'
import * as vars from './vars.mjs'
import log from 'npmlog'

vars.builtinPlugins.forEach(plugin => {
    log.info('typings', plugin)
    sh.exec(`yarn tsc --project ${plugin}/tsconfig.typings.json`, { fatal: true })
})
