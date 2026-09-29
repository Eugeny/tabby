const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

const terminalRoot = path.resolve(__dirname, '..')

class FakeWebglAddon {
    onContextLoss () {}
    dispose () {}
}

function compile (source) {
    return ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
}

function loadFrontend () {
    const source = readFileSync(path.join(terminalRoot, 'src/frontends/xtermFrontend.ts'), 'utf8')
    const module = { exports: {} }
    const addon = class {}
    const fakeRequire = name => {
        if (name === './frontend') {
            return { Frontend: class { destroy () {} } }
        }
        if (name === '@xterm/addon-webgl') {
            return { WebglAddon: FakeWebglAddon }
        }
        if (name.startsWith('@xterm/addon-')) {
            return Object.fromEntries([
                'FitAddon', 'LigaturesAddon', 'SearchAddon', 'Unicode11Addon',
                'SerializeAddon', 'ImageAddon', 'CanvasAddon',
            ].map(key => [key, addon]))
        }
        if (name === 'rxjs') {
            return { BehaviorSubject: class {} }
        }
        if (name === 'tabby-core') {
            return { Platform: { Web: 'Web' } }
        }
        return {}
    }
    vm.runInNewContext(compile(source), {
        exports: module.exports,
        module,
        require: fakeRequire,
        process,
        Buffer,
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        document: { hasFocus: () => true },
        window: { innerWidth: 1200, innerHeight: 800 },
    }, { filename: 'xtermFrontend.js' })
    return module.exports
}

function createFrontend () {
    const { XTermWebGLFrontend } = loadFrontend()
    const frontend = Object.create(XTermWebGLFrontend.prototype)
    const events = { addonDisposed: 0, contextLost: 0, redraws: 0, atlasClears: 0, terminalDisposed: 0 }
    const gl = { getExtension: name => name === 'WEBGL_lose_context'
        ? { loseContext: () => { events.contextLost++ } }
        : null }
    const rendererCanvas = {
        width: 800,
        height: 600,
        isConnected: true,
        getContext: kind => kind === 'webgl2' ? gl : null,
    }
    const rulerCanvas = {
        width: 8,
        height: 600,
        isConnected: true,
        getContext: () => null,
    }
    const addon = {
        dispose () {
            events.addonDisposed++
            rendererCanvas.isConnected = false
        },
        clearTextureAtlas () { events.atlasClears++ },
        _renderer: { _charAtlas: { pages: [{ canvas: { width: 4096, height: 4096 } }] } },
    }
    frontend.enableWebGL = true
    frontend.opened = true
    frontend.disposed = false
    frontend.element = {
        offsetParent: {},
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    }
    frontend.webGLAddon = addon
    frontend.pendingRendererRecovery = false
    frontend.rendererRecoveryAttempts = 2
    frontend.configService = { store: { terminal: { webGLAtlasBudgetMB: 48 } } }
    frontend.xterm = {
        element: { querySelectorAll: () => [rendererCanvas, rulerCanvas] },
        loadAddon: () => {},
        dispose: () => {
            events.terminalDisposed++
            rendererCanvas.isConnected = false
            rulerCanvas.isConnected = false
        },
    }
    frontend.redraw = () => { events.redraws++ }
    return { frontend, events, rendererCanvas, rulerCanvas }
}

function visibilityCallback (frontend) {
    const source = readFileSync(path.join(terminalRoot, 'src/api/baseTerminalTab.component.ts'), 'utf8')
    const file = ts.createSourceFile('baseTerminalTab.component.ts', source, ts.ScriptTarget.Latest, true)
    let callback
    function visit (node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
            && node.expression.name.text === 'subscribe' && node.arguments.length === 1) {
            const candidate = node.arguments[0]
            if (ts.isArrowFunction(candidate) && candidate.getText(file).includes('this.frontend.reactivate()')) {
                callback = candidate.getText(file)
            }
        }
        ts.forEachChild(node, visit)
    }
    visit(file)
    assert.ok(callback, 'terminal visibility subscription exists')
    const module = { exports: {} }
    vm.runInNewContext(compile(`module.exports = function () { return ${callback} }`), {
        module,
        exports: module.exports,
        XTermFrontend: frontend.constructor,
    })
    return module.exports.call({ frontend })
}

test('hidden tabs release their renderer after the visibility delay', () => {
    const { frontend } = createFrontend()
    let released = 0
    let reactivated = 0
    frontend.deactivate = () => { released++ }
    frontend.reactivate = () => { reactivated++ }
    const onVisibility = visibilityCallback(frontend)
    onVisibility(false)
    onVisibility(true)
    assert.equal(released, 1)
    assert.equal(reactivated, 1)
})

test('planned hidden-tab release frees only detached renderer canvases and reattaches on show', () => {
    const { frontend, events, rendererCanvas, rulerCanvas } = createFrontend()
    frontend.deactivate()
    assert.equal(events.addonDisposed, 1)
    assert.equal(events.contextLost, 1)
    assert.equal(rendererCanvas.width, 0)
    assert.equal(rendererCanvas.height, 0)
    assert.equal(rulerCanvas.width, 8, 'live ruler canvas must stay intact')
    frontend.reactivate()
    assert.ok(frontend.webGLAddon, 'renderer must return when the tab is shown')
    assert.equal(frontend.rendererRecoveryAttempts, 0, 'planned reattachment must not spend recovery budget')
    assert.ok(events.redraws > 0)
})

test('closing a terminal explicitly releases its WebGL context and canvas backing store', () => {
    const { frontend, events, rendererCanvas } = createFrontend()
    frontend.element = undefined
    frontend.destroy()
    assert.equal(events.terminalDisposed, 1)
    assert.equal(events.contextLost, 1)
    assert.equal(rendererCanvas.width, 0)
    assert.equal(rendererCanvas.height, 0)
})

test('a glyph atlas above the configured budget is cleared when the tab is shown', () => {
    const { frontend, events } = createFrontend()
    frontend.reactivate()
    assert.equal(events.atlasClears, 1)

    const belowBudget = createFrontend()
    belowBudget.frontend.configService.store.terminal.webGLAtlasBudgetMB = 96
    belowBudget.frontend.reactivate()
    assert.equal(belowBudget.events.atlasClears, 0)
})

test('sixel images use the configured per-terminal storage limit', () => {
    const source = readFileSync(path.join(terminalRoot, 'src/frontends/xtermFrontend.ts'), 'utf8')
    const file = ts.createSourceFile('xtermFrontend.ts', source, ts.ScriptTarget.Latest, true)
    let expression
    function visit (node) {
        if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'ImageAddon') {
            expression = node.getText(file)
        }
        ts.forEachChild(node, visit)
    }
    visit(file)
    assert.ok(expression, 'terminal creates an xterm image addon')
    const module = { exports: {} }
    vm.runInNewContext(compile(`module.exports = function () { return ${expression} }`), {
        module,
        exports: module.exports,
        ImageAddon: class { constructor (options) { this.options = options } },
    })
    const addon = module.exports.call({ configService: { store: { terminal: { imageStorageLimitMB: 32 } } } })
    assert.equal(addon.options?.storageLimit, 32)
})
