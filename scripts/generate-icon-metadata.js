#!/usr/bin/env node
const jsYaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const metadata = jsYaml.load(fs.readFileSync(path.resolve(__dirname, '../node_modules/@fortawesome/fontawesome-free/metadata/icons.yml')))

let result = {}
for (let key in metadata) {
    result[key] = metadata[key].styles.map(x => x[0])
}

fs.writeFileSync(path.resolve(__dirname, '../tabby-core/src/icons.json'), JSON.stringify(result))
