#!/usr/bin/env node
import sh from 'shelljs'
import * as vars from './vars.mjs'
import log from 'npmlog'

for (const plugin of vars.builtinPlugins) {
    log.info('typings', plugin)
    const result = sh.exec(`yarn tsc --project ${plugin}/tsconfig.typings.json`)
    if (result.code !== 0) {
        process.exit(result.code)
    }
}
