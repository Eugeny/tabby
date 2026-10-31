import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { parseConfig, serializeConfig } from '../src/api/configSerialization.ts'

const require = createRequire(import.meta.url)
const legacy = require('../../app/node_modules/js-yaml')

test('hex salts are quoted and remain strings through both bundled YAML parsers', () => {
    for (const salt of ['5631e17759586923', '7293376e16807802', '0000000000000001', '1234567890123456']) {
        const config = { vault: { version: 1, keySalt: salt, iv: 'ab'.repeat(16), contents: 'YWJj' } }
        const data = serializeConfig(config)
        assert.match(data, /keySalt: ['"]/)
        assert.deepEqual(parseConfig(data), config)
        assert.deepEqual(legacy.load(data), config)
    }
})

test('keeps ordinary strings, numbers, booleans, and lists intact', () => {
    const config = { version: 7, enabled: true, optional: null, profiles: [{ name: '1234e10', options: { port: 2222, cwd: 'a \'quoted\' path' } }] }
    assert.deepEqual(legacy.load(serializeConfig(config)), config)
    assert.deepEqual(parseConfig(serializeConfig(config)), config)
})

test('reads an existing unquoted overflowing hex salt using the core parser', () => {
    const config = parseConfig('vault:\n  keySalt: 5631e17759586923\n')
    assert.equal(config.vault.keySalt, '5631e17759586923')
    assert.equal(legacy.load(serializeConfig(config)).vault.keySalt, '5631e17759586923')
})
