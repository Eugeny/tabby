#!/usr/bin/env node
const sh = require('shelljs')
const fs = require('fs/promises')
const vars = require('./vars')
const log = require('npmlog')

const tempOutput = 'locale/app.new.pot'
const pot = 'locale/app.pot'
const tempHtml = 'locale/tmp-html'

;(async () => {
    sh.mkdir('-p', tempHtml)
    for (const plugin of vars.builtinPlugins) {
        log.info('extract-pug', plugin)

        sh.exec(`yarn pug --doctype html -s --pretty -O '{require: function(){}}' -o ${tempHtml}/${plugin} ${plugin}`, { fatal: true })

        log.info('extract-ts', plugin)
        sh.exec(`node node_modules/.bin/ngx-translate-extract -i ${plugin}/src -m -s -f pot -o ${tempOutput}`, { fatal: true })
    }

    log.info('extract-pug')
    sh.exec(`node node_modules/.bin/ngx-translate-extract -i ${tempHtml} -f pot -s -o ${tempOutput}`, { fatal: true })

    sh.rm('-r', tempHtml)
    await fs.rename(tempOutput, pot)
})()
