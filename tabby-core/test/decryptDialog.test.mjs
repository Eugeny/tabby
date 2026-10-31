import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/config.service.ts', import.meta.url), 'utf8')
const ast = ts.createSourceFile('config.service.ts', source, ts.ScriptTarget.Latest, true)
const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'ConfigService')
const method = cls.members.find(node => node.name?.getText(ast) === 'maybeDecryptConfig')
const compiled = ts.transpileModule(`class Probe { ${method.getText(ast)} }; return Probe`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText
const Probe = new Function(compiled)()
const quit = new Error('TEST_QUIT')
const store = { encrypted: true, vault: { contents: 'fixture' } }

function create (responses) {
    const dialogs = []
    const instance = Object.assign(new Probe(), {
        vault: { getPassphrase: async () => 'wrong', decrypt: async () => { throw Error('bad decrypt') } },
        translate: { instant: value => value },
        platform: { showMessageBox: async options => {
            dialogs.push(options)
            assert.ok(dialogs.length <= 2, 'Unexpected repeated recovery dialog')
            const response = responses(options, dialogs.length)
            assert.ok(Number.isInteger(response), 'Dialog cancellation must have an explicit action')
            return { response }
        },
            quit: () => { throw quit } },
    })
    return { instance, dialogs }
}

test('Escape on decrypt failure chooses Quit without entering erase confirmation', async () => {
    const { instance, dialogs } = create(options => options.cancelId)
    const before = JSON.stringify(store)
    await assert.rejects(instance.maybeDecryptConfig(store), error => error === quit)
    assert.equal(dialogs.length, 1)
    assert.equal(dialogs[0].cancelId, dialogs[0].buttons.indexOf('Quit'))
    assert.equal(JSON.stringify(store), before)
})

test('Escape on erase confirmation continues to choose Quit', async () => {
    const { instance, dialogs } = create((options, index) => index === 1 ? 1 : options.cancelId)
    await assert.rejects(instance.maybeDecryptConfig(store), error => error === quit)
    assert.equal(dialogs.length, 2)
    assert.equal(dialogs[1].cancelId, 1)
})

test('intentional erasure still requires the second confirmation', async () => {
    const { instance, dialogs } = create((_options, index) => index === 1 ? 1 : 0)
    assert.deepEqual(await instance.maybeDecryptConfig(store), {})
    assert.equal(dialogs.length, 2)
})

test('Try again still permits a successful unlock', async () => {
    const { instance, dialogs } = create(() => 0)
    let attempts = 0
    instance.vault.decrypt = async () => {
        if (attempts++ === 0) throw new Error('bad decrypt')
        return { config: { marker: 'retained' } }
    }
    const recovered = await instance.maybeDecryptConfig(store)
    assert.equal(recovered.marker, 'retained')
    assert.equal(dialogs.length, 1)
})
