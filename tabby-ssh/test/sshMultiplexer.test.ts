import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

// SSHMultiplexerService carries an Angular decorator, which Node's type stripping cannot load, so the
// service source is transpiled with the TypeScript compiler and evaluated with a stubbed `@angular/core`.
const require = createRequire(import.meta.url)
const { Subject } = require('rxjs')
const source = readFileSync(new URL('../src/services/sshMultiplexer.service.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true,
} }).outputText
const serviceModule: { exports: any } = { exports: {} }
// eslint-disable-next-line @typescript-eslint/no-implied-eval
new Function('require', 'module', 'exports', compiled)((name: string) => {
    if (name === '@angular/core') {
        return { Injectable: () => (value: any) => value }
    }
    return require(name)
}, serviceModule, serviceModule.exports)
const { SSHMultiplexerService } = serviceModule.exports
const profile = { type: 'ssh', name: 'test', options: { host: 'test.invalid', user: 'test', port: 22 } }
const create = () => new SSHMultiplexerService({ getConfigProxyForProfile: (value: any) => value })
const session = () => ({ profile, isReusable: true, willDestroy$: new Subject() })

test('returns live sessions and evicts sessions that become unusable', async () => {
    const cache = create(), current = session()
    await cache.addSession(current)
    assert.equal(await cache.getSession(profile), current)
    current.isReusable = false
    assert.equal(await cache.getSession(profile), null)
    assert.equal(await cache.getSession(profile), null)
})

test('does not cache a session destroyed while its key is resolving', async () => {
    const cache = create(), current = session()
    const adding = cache.addSession(current)
    current.willDestroy$.next()
    current.willDestroy$.complete()
    await adding
    assert.equal(await cache.getSession(profile), null)
})

test('does not cache an unusable session and releases its observer', async () => {
    const cache = create(), current = session()
    current.isReusable = false
    await cache.addSession(current)
    assert.equal(await cache.getSession(profile), null)
    assert.equal(current.willDestroy$.observers.length, 0)
})

test('old-session teardown cannot evict a live replacement', async () => {
    const cache = create(), old = session(), replacement = session()
    await cache.addSession(old)
    await cache.addSession(replacement)
    old.willDestroy$.next()
    assert.equal(await cache.getSession(profile), replacement)
    replacement.willDestroy$.next()
    assert.equal(await cache.getSession(profile), null)
})

test('failed key resolution releases the early destruction observer', async () => {
    const cache = new SSHMultiplexerService({
        getConfigProxyForProfile: (value: any) => value,
        getProfiles: async () => { throw new Error('profiles unavailable') },
    })
    const current = { ...session(), profile: { ...profile, options: { ...profile.options, jumpHost: 'jump' } } }
    await assert.rejects(cache.addSession(current), /profiles unavailable/)
    assert.equal(current.willDestroy$.observers.length, 0)
})
