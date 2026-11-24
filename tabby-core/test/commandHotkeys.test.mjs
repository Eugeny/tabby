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
const Probe = loadMethod('../src/services/commands.service.ts', 'CommandService', 'runHotkey')

const split = { name: 'split' }, pane = { name: 'pane', parent: split }

function fixture () {
    const ran = [], calls = new Map()
    const provider = (name, fn) => ({ provide: async context => { calls.set(name, (calls.get(name) ?? 0) + 1); return fn(context) } })
    const providers = [
        // Like core:close-tab: only bound for the top-level tab, and disabled when pinned
        provider('core', ({ tab }) => tab && !tab.parent ? [{ id: 'close-tab', hotkey: 'close-tab', run: tab.pinned ? undefined : async () => ran.push(['close-tab', tab.name]) }] : []),
        // Offered in every tab context: the focused pane must win
        provider('terminal', ({ tab }) => tab ? [{ id: 'paste', hotkey: 'paste', run: async () => ran.push(['paste', tab.name]) }] : []),
    ]
    const service = Object.assign(new Probe(), {
        hotkeyProviders: new Map(),
        commandProviders: providers,
        config: { enabledServices: x => x },
        getActiveContexts: () => [{}, { tab: split }, { tab: pane }],
    })
    return { service, ran, calls }
}

test('runs the bound command in the most specific matching context', async () => {
    const f = fixture()
    await f.service.runHotkey('paste')
    await f.service.runHotkey('close-tab')
    assert.deepEqual(f.ran, [['paste', 'pane'], ['close-tab', 'split']])
})

test('a command without run is a no-op, as is an unbound hotkey', async () => {
    const f = fixture()
    split.pinned = true
    try {
        await f.service.runHotkey('close-tab')
        await f.service.runHotkey('nonexistent')
    } finally {
        split.pinned = false
    }
    assert.deepEqual(f.ran, [])
})

test('only asks the providers that answered a hotkey before', async () => {
    const f = fixture()
    await f.service.runHotkey('paste')
    f.calls.clear()
    await f.service.runHotkey('paste')
    assert.deepEqual([...f.calls.keys()], ['terminal'])
    assert.deepEqual(f.ran, [['paste', 'pane'], ['paste', 'pane']])
})
