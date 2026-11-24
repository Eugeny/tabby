import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

function loadMethod (file, className, name, bindings = {}) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === className)
    const method = cls.members.find(n => n.name?.getText(ast) === name)
    const code = ts.transpileModule(`class Probe { ${method.getText(ast)} }; return Probe`, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText
    return new Function(...Object.keys(bindings), code)(...Object.values(bindings))
}
class SplitTab {}
const Probe = loadMethod('../src/services/commands.service.ts', 'CommandService', 'showSelector', { SplitTabComponent: SplitTab })

function deferred () {
    let resolve, reject
    const promise = new Promise((yes, no) => { resolve = yes; reject = no })
    return { promise, resolve, reject }
}

function fixture () {
    const discovered = deferred(), closed = deferred()
    const calls = { discoveries: 0, modals: [] }
    const selector = { active: false, show: (...args) => { calls.modals.push(args); return closed.promise } }
    const service = Object.assign(new Probe(), {
        selector, app: { activeTab: null }, translate: { instant: s => s },
        getCommands: async context => { calls.discoveries++; calls.context = context; return discovered.promise },
    })
    return { service, selector, discovered, closed, calls }
}

test('coalesces requests while discovery is pending and while the palette is open', async () => {
    const f = fixture(), first = f.service.showSelector()
    await f.service.showSelector()
    assert.equal(f.calls.discoveries, 1)
    const command = { label: 'Run', sublabel: 'Details', icon: 'icon', run: () => {} }
    f.discovered.resolve([command])
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(f.calls.modals, [['Commands', [{ name: 'Run', callback: command.run, description: 'Details', icon: 'icon' }]]])
    await f.service.showSelector()
    assert.equal(f.calls.discoveries, 1)
    f.closed.resolve()
    await first
    await f.service.showSelector()
    assert.equal(f.calls.discoveries, 2)
})

test('releases the pending request after discovery fails', async () => {
    const f = fixture(), first = f.service.showSelector()
    f.discovered.reject(new Error('discovery failed'))
    await assert.rejects(first, /discovery failed/)
    f.service.getCommands = async () => []
    f.closed.resolve()
    await f.service.showSelector()
    assert.equal(f.calls.modals.length, 1)
})

test('allows reopening after dismissal', async () => {
    const f = fixture(), first = f.service.showSelector()
    f.discovered.resolve([])
    f.closed.reject(new Error('dismissed'))
    await assert.rejects(first, /dismissed/)
    f.selector.show = () => Promise.resolve()
    await f.service.showSelector()
    assert.equal(f.calls.discoveries, 2)
})

test('allows retrying a failed modal creation', async () => {
    const f = fixture()
    f.discovered.resolve([])
    f.selector.show = () => { throw new Error('open failed') }
    await assert.rejects(f.service.showSelector(), /open failed/)
    f.selector.show = () => Promise.resolve()
    await f.service.showSelector()
    assert.equal(f.calls.discoveries, 2)
})

test('keeps an existing selector and preserves the focused pane context', async () => {
    const f = fixture()
    f.selector.active = true
    await f.service.showSelector()
    assert.equal(f.calls.discoveries, 0)
    f.selector.active = false
    const pane = {}
    f.service.app.activeTab = Object.assign(new SplitTab(), { getFocusedTab: () => pane })
    f.discovered.resolve([])
    f.closed.resolve()
    await f.service.showSelector()
    assert.deepEqual(f.calls.context, { tab: pane })
})

const Selector = loadMethod('../src/services/selector.service.ts', 'SelectorService', 'show', { SelectorModalComponent: class {} })
test('selector cleanup consumes dismissal and cannot clear a newer modal', async () => {
    const first = deferred(), second = deferred()
    const refs = [first, second].map(d => ({ result: d.promise, componentInstance: {} }))
    const service = Object.assign(new Selector(), { ngbModal: { open: () => refs.shift() } })
    const one = service.show('One', []).catch(() => null)
    const two = service.show('Two', [])
    const current = service.current
    first.reject(new Error('dismissed'))
    await one
    assert.equal(service.current, current)
    second.resolve('chosen')
    assert.equal(await two, 'chosen')
    assert.equal(service.current, null)
})
