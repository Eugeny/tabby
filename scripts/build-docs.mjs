#!/usr/bin/env node
import sh from 'shelljs'
import * as vars from './vars.mjs'
import log from 'npmlog'

vars.packagesWithDocs.forEach(([dest, src]) => {
    log.info('docs', src)
    sh.exec(`yarn typedoc --out docs/api/${dest} --tsconfig ${src}/tsconfig.typings.json ${src}/src/index.ts`, { fatal: true })
})
