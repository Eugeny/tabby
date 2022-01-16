#!/usr/bin/env node
const sh = require('shelljs')
const vars = require('./vars')
const log = require('npmlog')

vars.packagesWithDocs.forEach(([dest, src]) => {
    log.info('docs', src)
    sh.exec(`yarn typedoc --out docs/api/${dest} --tsconfig ${src}/tsconfig.typings.json ${src}/src/index.ts`, { fatal: true })
})
