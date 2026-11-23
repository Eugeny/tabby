import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { setImmediate } from 'node:timers/promises'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load (file, dependencies) {
    const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, esModuleInterop: true,
    } }).outputText
    const module = { exports: {} }
    new Function('require', 'module', 'exports', source)(dependencies, module, module.exports)
    return module.exports
}
const middleware = load('../../tabby-terminal/src/api/middleware.ts', name => name === 'tabby-core' ? {} : require(name))
const matcher = load('../src/promptMatcher.ts', require)
const { AutoSudoPasswordMiddleware } = load('../src/decorator.ts', name => {
    if (name === '@angular/core') return { Injectable: () => value => value }
    if (name === 'tabby-terminal') return { ...middleware, TerminalDecorator: class {} }
    if (name === 'tabby-ssh') return {}
    if (name === './promptMatcher') return matcher
    return require(name)
})

for (const interaction of ['input', 'output', 'close']) {
    test(`does not offer a late password after ${interaction}`, async () => {
        let resolvePassword = () => undefined
        const password = new Promise(resolve => { resolvePassword = resolve })
        const instance = new AutoSudoPasswordMiddleware({ options: { user: 'test' } }, { loadPassword: () => password })
        let terminal = '', sent = ''
        instance.outputToTerminal$.subscribe(data => { terminal += data.toString() })
        instance.outputToSession$.subscribe(data => { sent += data.toString() })
        instance.feedFromSession(Buffer.from('[sudo] password for test: '))
        if (interaction === 'input') instance.feedFromTerminal(Buffer.from('x'))
        if (interaction === 'output') instance.feedFromSession(Buffer.from('\r\nnormal prompt'))
        if (interaction === 'close') instance.close()
        resolvePassword('FIXTURE_SECRET')
        await setImmediate()
        instance.feedFromTerminal(Buffer.from([13]))
        assert.doesNotMatch(terminal, /Press Enter|FIXTURE_SECRET/)
        assert.doesNotMatch(sent, /FIXTURE_SECRET/)
        instance.close()
    })
}

test('only the latest prompt lookup can offer a password', async () => {
    const requests = []
    const instance = new AutoSudoPasswordMiddleware({ options: { user: 'test' } }, {
        loadPassword: () => new Promise(resolve => { requests.push(resolve) }),
    })
    let terminal = '', sent = ''
    instance.outputToTerminal$.subscribe(data => { terminal += data.toString() })
    instance.outputToSession$.subscribe(data => { sent += data.toString() })
    instance.feedFromSession(Buffer.from('[sudo] password for test: '))
    instance.feedFromSession(Buffer.from('\n[sudo] password for test: '))
    requests[0]('OLD_FIXTURE')
    requests[1]('NEW_FIXTURE')
    await setImmediate()
    instance.feedFromTerminal(Buffer.from([13]))
    assert.equal((terminal.match(/Press Enter/g) ?? []).length, 1)
    assert.equal(sent, 'NEW_FIXTURE\n')
    instance.close()
})

test('withdraws the offer when new output makes it stale', async () => {
    const instance = new AutoSudoPasswordMiddleware({ options: { user: 'test' } }, { loadPassword: async () => 'FIXTURE_SECRET' })
    let terminal = '', sent = ''
    instance.outputToTerminal$.subscribe(data => { terminal += data.toString() })
    instance.outputToSession$.subscribe(data => { sent += data.toString() })
    instance.feedFromSession(Buffer.from('[sudo] password for test: '))
    await setImmediate()
    assert.match(terminal, /Press Enter/)
    instance.feedFromSession(Buffer.from('\r\nsudo: timed out reading password\r\n$ '))
    // the hint is erased with backspaces before the new output is shown
    assert.match(terminal, /Press Enter[^\r]*\x08+ +\x08+\r\nsudo: timed out/)
    instance.feedFromTerminal(Buffer.from([13]))
    assert.equal(sent, '\r')
    instance.close()
})
