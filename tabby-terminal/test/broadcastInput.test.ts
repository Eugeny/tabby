import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

function loadMethods (file, className, names, bindings = {}) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === className) as ts.ClassDeclaration
    const methods = names.map(name => cls.members.find(n => n.name?.getText(ast) === name)!.getText(ast)).join('\n')
    const code = ts.transpileModule(`class Probe { ${methods} }; return Probe`, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText
    // Compile the actual methods without bootstrapping Angular and Electron.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function(...Object.keys(bindings), code)(...Object.values(bindings))
}
class SplitTab {
    _allFocusMode = false
    layoutCalls = 0
    layout () { this.layoutCalls++ }
}
const Broadcast = loadMethods('../src/services/multifocus.service.ts', 'MultifocusService', ['start', 'cancel', 'getInputTargets'], {
    SplitTabComponent: SplitTab, document: { querySelector: () => ({ style: {} }) },
})
const Platform = { Windows: 'windows', Linux: 'linux', macOS: 'macos' }
const Terminal = loadMethods('../src/api/baseTerminalTab.component.ts', 'BaseTerminalTabComponent', ['sendInput', 'sendInputToSession', 'paste'], {
    Platform, OSC_FOCUS_IN: Buffer.from('\x1b[I'), OSC_FOCUS_OUT: Buffer.from('\x1b[O'),
})

function fixture (clipboard = 'PASTE') {
    const broadcast = Object.assign(new Broadcast(), { warningElement: { style: {} } })
    const state = { prompts: 0, response: Promise.resolve({ response: 0 }) }
    const config = { store: { terminal: { scrollOnInput: true, warnOnMultilinePaste: true, bracketedPaste: true } } }
    const create = () => {
        const writes: Buffer[] = []
        let scrolls = 0
        const tab = Object.assign(new Terminal(), {
            session: { feedFromTerminal: data => writes.push(data) },
            frontend: { scrollToBottom: () => { scrolls++ }, supportsBracketedPaste: () => false },
            multifocus: broadcast, config, alternateScreenActive: false,
            hostApp: { platform: Platform.Linux }, translate: { instant: s => s },
            platform: { readClipboard: () => clipboard, showMessageBox: () => { state.prompts++; return state.response } },
        })
        return { tab, writes, scrolls: () => scrolls, text: () => writes.map(b => b.toString()) }
    }
    const source = create(), other = create()
    broadcast.start(source.tab, [source.tab, other.tab, other.tab])
    return { broadcast, source, other, state, create }
}

test('routes all session input once and does not rebroadcast a recipient write', () => {
    const f = fixture()
    f.source.tab.sendInput('x')
    f.source.tab.sendInput(Buffer.from('\x1bOH'))
    assert.deepEqual(f.source.text(), ['x', '\x1bOH'])
    assert.deepEqual(f.other.text(), ['x', '\x1bOH'])
    f.other.tab.sendInput('private')
    assert.deepEqual(f.source.text(), ['x', '\x1bOH'])
    assert.deepEqual(f.other.text(), ['x', '\x1bOH', 'private'])
    assert.equal(f.source.scrolls(), 2)
})

test('cancelling returns to local input and starting a new set replaces the old targets', () => {
    const f = fixture(), third = f.create()
    f.broadcast.cancel()
    f.source.tab.sendInput('local')
    const parent = new SplitTab()
    f.source.tab.parent = parent
    f.broadcast.start(f.source.tab, [third.tab])
    assert.equal(parent._allFocusMode, true)
    f.source.tab.sendInput('new')
    assert.deepEqual(f.source.text(), ['local', 'new'])
    assert.deepEqual(f.other.text(), [])
    assert.deepEqual(third.text(), ['new'])
    f.broadcast.cancel()
    assert.equal(parent._allFocusMode, false)
    assert.equal(parent.layoutCalls, 2)
})

test('terminal focus reports stay local and do not scroll', () => {
    const f = fixture()
    f.source.tab.sendInput('\x1b[I')
    f.source.tab.sendInput('\x1b[O')
    assert.deepEqual(f.source.text(), ['\x1b[I', '\x1b[O'])
    assert.deepEqual(f.other.text(), [])
    assert.equal(f.source.scrolls(), 0)
})

test('paste applies bracketed framing separately for each destination', async () => {
    const f = fixture()
    f.source.tab.frontend.supportsBracketedPaste = () => true
    await f.source.tab.paste()
    assert.deepEqual(f.source.text(), ['\x1b[200~PASTE\x1b[201~'])
    assert.deepEqual(f.other.text(), ['PASTE'])
    assert.equal(f.state.prompts, 0)
})

test('multiline paste asks once and sends the approved text once to each target', async () => {
    const f = fixture('one\ntwo')
    f.source.tab.alternateScreenActive = true
    await f.source.tab.paste()
    assert.equal(f.state.prompts, 1, 'a normal-screen recipient still needs confirmation')
    assert.deepEqual(f.source.text(), ['one\rtwo'])
    assert.deepEqual(f.other.text(), ['one\rtwo'])
})

test('cancelling multiline paste writes to no target', async () => {
    const f = fixture('one\ntwo')
    f.state.response = Promise.resolve({ response: 1 })
    await f.source.tab.paste()
    assert.equal(f.state.prompts, 1)
    assert.deepEqual(f.source.text(), [])
    assert.deepEqual(f.other.text(), [])
})

test('changing the broadcast set while confirming cancels the pending paste', async () => {
    const f = fixture('one\ntwo'), third = f.create()
    let confirm = (_response: { response: number }) => { throw Error('Confirmation not initialized') }
    f.state.response = new Promise(resolve => { confirm = resolve })
    const pending = f.source.tab.paste()
    f.broadcast.cancel()
    f.broadcast.start(f.source.tab, [third.tab])
    confirm({ response: 0 })
    await pending
    assert.deepEqual(f.source.text(), [])
    assert.deepEqual(f.other.text(), [])
    assert.deepEqual(third.text(), [])
})

test('reconnecting a target while confirming cancels the pending paste', async () => {
    const f = fixture('one\ntwo')
    let confirm = (_response: { response: number }) => { throw Error('Confirmation not initialized') }
    f.state.response = new Promise(resolve => { confirm = resolve })
    const pending = f.source.tab.paste()
    f.other.tab.session = { feedFromTerminal: () => { throw Error('must not paste into a new session') } }
    confirm({ response: 0 })
    await pending
    assert.deepEqual(f.source.text(), [])
})

test('paste preserves alternate-screen whitespace while trimming normal-screen input', async () => {
    const f = fixture('  text  ')
    f.source.tab.config.store.terminal.trimWhitespaceOnPaste = true
    f.source.tab.alternateScreenActive = true
    await f.source.tab.paste()
    assert.deepEqual(f.source.text(), ['  text  '])
    assert.deepEqual(f.other.text(), ['text'])
})
