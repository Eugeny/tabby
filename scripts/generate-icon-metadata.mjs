#!/usr/bin/env node
import jsYaml from 'js-yaml'
import fs from 'node:fs'
import path from 'node:path'

import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))


const metadata = jsYaml.load(fs.readFileSync(path.resolve(__dirname, '../node_modules/@fortawesome/fontawesome-free/metadata/icons.yml')))

let result = {}
for (let key in metadata) {
    result[key] = metadata[key].styles.map(x => x[0])
}

fs.writeFileSync(path.resolve(__dirname, '../tabby-core/src/icons.json'), JSON.stringify(result))
