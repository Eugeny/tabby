import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const file = new URL('../src/session/ssh.ts', import.meta.url)
const ast = ts.createSourceFile(file.pathname, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'SSHSession') as ts.ClassDeclaration
const method = cls.members.find(n => n.name?.getText(ast) === 'applyProfilePortForwards')!.getText(ast)
const code = ts.transpileModule(`return class { ${method} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText
class Forward {
    host = '127.0.0.1'
    toString () { return 'forward' }
}
// Compile the real method without bootstrapping Angular or a native SSH client.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const Session = new Function('ForwardedPort', 'PortForwardType', '_', code)(Forward, { Dynamic: 'Dynamic' }, x => x)
const forward = (port = 1000, extra = {}) => ({ type: 'Local', host: '127.0.0.1', port, targetAddress: 'localhost', targetPort: 22, ...extra })
const profile = (...forwardedPorts) => ({ options: { forwardedPorts } })
function fixture () {
    const calls: any[] = [], errors: any[] = []
    const session = Object.assign(new Session(), {
        forwardedPorts: [], pendingProfileForwards: new Map(),
        notifications: { error: (...args) => errors.push(args) },
        translate: { instant: x => x },
        addPortForward: async fw => { calls.push(fw); session.forwardedPorts.push(fw) },
    })
    return { session, calls, errors }
}

test('adds missing profile forwards and preserves the shared connection union', async () => {
    const f = fixture()
    await f.session.applyProfilePortForwards(profile(forward()))
    await f.session.applyProfilePortForwards(profile(forward(2000)))
    await f.session.applyProfilePortForwards(profile())
    assert.deepEqual(f.session.forwardedPorts.map(x => x.port), [1000, 2000])
})

test('deduplicates profile entries and existing ad hoc forwards regardless of description', async () => {
    const f = fixture()
    f.session.forwardedPorts.push(forward(1000, { description: 'Manual forward' }))
    await f.session.applyProfilePortForwards(profile(forward(1000, { description: 'Profile forward' }), forward(2000), forward(2000)))
    assert.deepEqual(f.calls.map(x => x.port), [2000])
})

test('concurrent tabs share an in-flight forward setup and wait for it', async () => {
    const f = fixture()
    let release = () => { throw Error('Forward setup not initialized') }
    const gate = new Promise<void>(resolve => { release = resolve })
    f.session.addPortForward = async fw => { f.calls.push(fw); await gate; f.session.forwardedPorts.push(fw) }
    let finished = false
    const first = f.session.applyProfilePortForwards(profile(forward()))
    const second = f.session.applyProfilePortForwards(profile(forward())).then(() => { finished = true })
    assert.equal(f.calls.length, 1)
    assert.equal(finished, false)
    release()
    await Promise.all([first, second])
    assert.equal(finished, true)
    assert.equal(f.session.forwardedPorts.length, 1)
})

test('a failed shared setup reports once, leaves the shell usable and can be retried', async () => {
    const f = fixture()
    const add = f.session.addPortForward
    f.session.addPortForward = async fw => { f.calls.push(fw); throw Error('Address in use') }
    await Promise.all([
        f.session.applyProfilePortForwards(profile(forward())),
        f.session.applyProfilePortForwards(profile(forward())),
    ])
    assert.equal(f.errors.length, 1)
    assert.equal(f.session.pendingProfileForwards.size, 0)
    assert.equal(f.session.forwardedPorts.length, 0)
    f.session.addPortForward = add
    await f.session.applyProfilePortForwards(profile(forward()))
    assert.equal(f.session.forwardedPorts.length, 1)
})

test('different destinations are not silently treated as the same tunnel', async () => {
    const f = fixture()
    f.session.forwardedPorts.push(forward())
    await f.session.applyProfilePortForwards(profile(forward(1000, { targetPort: 2222 })))
    assert.equal(f.calls.length, 1)
    assert.equal(f.calls[0].targetPort, 2222)
    assert.equal(f.session.forwardedPorts[0].targetPort, 22)
})

test('can recreate a profile forward after it is manually removed', async () => {
    const f = fixture()
    await f.session.applyProfilePortForwards(profile(forward()))
    f.session.forwardedPorts = []
    await f.session.applyProfilePortForwards(profile(forward()))
    assert.equal(f.calls.length, 2)
})

test('dynamic forwards ignore unused destination fields when matching', async () => {
    const f = fixture()
    f.session.forwardedPorts.push(forward(1080, { type: 'Dynamic', targetPort: 80 }))
    await f.session.applyProfilePortForwards(profile(forward(1080, { type: 'Dynamic', targetPort: 443 })))
    assert.equal(f.calls.length, 0)
})

test('normalizes an omitted bind host using the forward default', async () => {
    const f = fixture()
    f.session.forwardedPorts.push(forward())
    const config = forward()
    delete config.host
    await f.session.applyProfilePortForwards(profile(config))
    assert.equal(f.calls.length, 0)
})

test('reused-session attachment does not wait for a pending profile forward', async () => {
    const setupFile = new URL('../src/components/sshTab.component.ts', import.meta.url)
    const setupAst = ts.createSourceFile(setupFile.pathname, readFileSync(setupFile, 'utf8'), ts.ScriptTarget.Latest, true)
    const setupClass = setupAst.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'SSHTabComponent') as ts.ClassDeclaration
    const setupMethod = setupClass.members.find(n => n.name?.getText(setupAst) === 'setupOneSession')!.getText(setupAst)
    const setupCode = ts.transpileModule(`return class { ${setupMethod} }`, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const Tab = new Function(setupCode)()
    let release = () => { throw Error('Forward setup not initialized') }
    let requested = false
    const pending = new Promise<void>(resolve => { release = resolve })
    const session = {
        open: true,
        applyProfilePortForwards: () => { requested = true; return pending },
    }
    const tab = Object.assign(new Tab(), {
        sshMultiplexer: { getSession: async () => session },
        attachSessionHandler: () => undefined,
    })
    let attached = false
    const attaching = tab.setupOneSession({}, { options: { reuseSession: true } }).then(result => {
        assert.equal(result, session)
        attached = true
    })
    await new Promise(resolve => setImmediate(resolve))
    try {
        assert.equal(requested, true)
        assert.equal(attached, true, 'a delayed bind must not block the shell from acquiring its connection ref')
    } finally {
        release()
        await attaching
    }
})
