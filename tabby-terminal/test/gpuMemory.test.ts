import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { disposeWebglAddon } from '../src/frontends/webglAddon.ts'

const terminalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

class FakeWebglAddon {
    onContextLoss () {}
    dispose () {}
}

function compile (source: string): string {
    return ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
}

// xtermFrontend.ts pulls in Angular, tabby-core and a stylesheet, so it runs in a
// sandbox with just the imports these tests touch.
function loadFrontend (): any {
    const source = readFileSync(path.join(terminalRoot, 'src/frontends/xtermFrontend.ts'), 'utf8')
    const module = { exports: {} as any }
    const addon = class {}
    const fakeRequire = (name: string) => {
        if (name === './frontend') {
            return { Frontend: class { destroy () {} } }
        }
        if (name === './webglAddon') {
            return { disposeWebglAddon }
        }
        if (name === '@xterm/addon-webgl') {
            return { WebglAddon: FakeWebglAddon }
        }
        if (name.startsWith('@xterm/addon-')) {
            return Object.fromEntries([
                'FitAddon', 'LigaturesAddon', 'SearchAddon', 'Unicode11Addon', 'SerializeAddon', 'ImageAddon',
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

// One page of size x size RGBA: 4096 is 64 MB, over the default 48 MB budget.
function fakeAtlas (size: number): any {
    return { pages: [{ canvas: { width: size, height: size } }] }
}

function createFrontend ({ frontendModule = loadFrontend(), atlas = fakeAtlas(4096), log = [] as string[] } = {}) {
    const { XTermWebGLFrontend } = frontendModule
    const frontend = Object.create(XTermWebGLFrontend.prototype)
    const events = { addonDisposed: 0, contextLost: 0, redraws: 0, terminalDisposed: 0, cleanupOrder: log }
    const gl = { getExtension: (name: string) => name === 'WEBGL_lose_context'
        ? { loseContext: () => { events.contextLost++ } }
        : null }
    const rendererCanvas = {
        width: 800,
        height: 600,
        isConnected: true,
        getContext: (kind: string) => kind === 'webgl2' ? gl : null,
    }
    const rulerCanvas = {
        width: 8,
        height: 600,
        isConnected: true,
        getContext: () => null,
    }
    // A WebGL addon whose renderer uses `atlas`.
    const rendererAddon = () => ({
        dispose () {
            events.addonDisposed++
            log.push('addon')
            rendererCanvas.isConnected = false
        },
        clearTextureAtlas () {},
        _renderer: {
            _charAtlas: atlas,
            _cursorBlinkStateManager: { dispose: () => log.push('blink manager') },
        },
    })
    frontend.enableWebGL = true
    frontend.opened = true
    frontend.disposed = false
    frontend.element = {
        offsetParent: {},
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    }
    frontend.webGLAddon = rendererAddon()
    frontend.pendingRendererRecovery = false
    frontend.rendererRecoveryAttempts = 2
    frontend.configService = { store: { terminal: { webGLAtlasBudgetMB: 48 } } }
    frontend.xterm = {
        element: { querySelectorAll: () => [rendererCanvas, rulerCanvas] },
        loadAddon: () => { log.push('attach') },
        dispose: () => {
            events.terminalDisposed++
            rendererCanvas.isConnected = false
            rulerCanvas.isConnected = false
        },
    }
    frontend.redraw = () => { events.redraws++ }
    // attach() registers every WebGL frontend.
    XTermWebGLFrontend.webGLFrontends.add(frontend)
    return { frontend, events, rendererCanvas, rulerCanvas, rendererAddon }
}

function visibilityCallback (frontend: any) {
    const source = readFileSync(path.join(terminalRoot, 'src/api/baseTerminalTab.component.ts'), 'utf8')
    const file = ts.createSourceFile('baseTerminalTab.component.ts', source, ts.ScriptTarget.Latest, true)
    let callback: string | undefined
    function visit (node: ts.Node) {
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
    const module = { exports: {} as any }
    vm.runInNewContext(compile(`module.exports = function () { return ${callback} }`), {
        module,
        exports: module.exports,
        XTermFrontend: frontend.constructor,
    })
    return module.exports.call({ frontend })
}

describe('XTermFrontend GPU memory', () => {
    it('hidden tabs release their renderer after the visibility delay', () => {
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

    it('planned hidden-tab release frees only detached renderer canvases and reattaches on show', () => {
        const { frontend, events, rendererCanvas, rulerCanvas } = createFrontend()
        frontend.deactivate()
        assert.equal(events.addonDisposed, 1)
        assert.equal(events.contextLost, 1)
        assert.deepEqual(events.cleanupOrder, ['blink manager', 'addon'])
        assert.equal(rendererCanvas.width, 0)
        assert.equal(rendererCanvas.height, 0)
        assert.equal(rulerCanvas.width, 8, 'live ruler canvas must stay intact')
        frontend.reactivate()
        assert.ok(frontend.webGLAddon, 'renderer must return when the tab is shown')
        assert.equal(frontend.rendererRecoveryAttempts, 0, 'planned reattachment must not spend recovery budget')
        assert.ok(events.redraws > 0)
    })

    it('closing a terminal explicitly releases its WebGL context and canvas backing store', () => {
        const { frontend, events, rendererCanvas } = createFrontend()
        frontend.element = undefined
        frontend.destroy()
        assert.equal(events.terminalDisposed, 1)
        assert.equal(events.contextLost, 1)
        assert.deepEqual(events.cleanupOrder, ['blink manager', 'addon'])
        assert.equal(rendererCanvas.width, 0)
        assert.equal(rendererCanvas.height, 0)
    })

    it('context loss disposes the cursor blink timer and releases the renderer before deferred recovery', () => {
        const { frontend, events, rendererCanvas } = createFrontend()
        frontend.element = undefined
        frontend.onWebGLContextLoss()
        assert.deepEqual(events.cleanupOrder, ['blink manager', 'addon'])
        assert.equal(events.contextLost, 1)
        assert.equal(rendererCanvas.width, 0)
        assert.equal(rendererCanvas.height, 0)
        assert.equal(frontend.webGLAddon, undefined)
        assert.equal(frontend.pendingRendererRecovery, true)
        assert.equal(frontend.rendererRecoveryAttempts, 2)
    })

    it('an over-budget glyph atlas is rebuilt by every terminal sharing it when a tab is shown', () => {
        const frontendModule = loadFrontend()
        const atlas = fakeAtlas(4096)
        const log: string[] = []
        const shown = createFrontend({ frontendModule, atlas, log })
        const sharing = createFrontend({ frontendModule, atlas, log })
        const other = createFrontend({ frontendModule, atlas: fakeAtlas(4096) })
        const oldAddon = sharing.frontend.webGLAddon
        shown.frontend.reactivate()
        // xterm disposes an atlas when its last renderer goes; a renderer created
        // before then would pick the old atlas back up.
        assert.deepEqual(log, ['blink manager', 'addon', 'blink manager', 'addon', 'attach', 'attach'])
        assert.equal(shown.events.contextLost, 1)
        assert.equal(sharing.events.contextLost, 1)
        assert.ok(sharing.frontend.webGLAddon instanceof FakeWebglAddon)
        assert.notEqual(sharing.frontend.webGLAddon, oldAddon)
        assert.ok(sharing.events.redraws > 0)
        assert.equal(sharing.frontend.rendererRecoveryAttempts, 2, 'a planned rebuild must not spend recovery budget')
        assert.equal(other.events.addonDisposed, 0, 'terminals on another atlas keep their renderer')
    })

    it('a glyph atlas within its budget is left alone', () => {
        const { frontend, events } = createFrontend({ atlas: fakeAtlas(2048) })
        frontend.reactivate()
        frontend.enforceAtlasBudget()
        assert.equal(events.addonDisposed, 0)
    })

    it('an atlas that survives its rebuild is not rebuilt again', () => {
        const { frontend, events, rendererAddon } = createFrontend()
        frontend.enforceAtlasBudget()
        assert.equal(events.addonDisposed, 1)
        // A renderer outside Tabby's frontends kept the atlas alive, so the new
        // renderer got the same one back.
        frontend.webGLAddon = rendererAddon()
        frontend.enforceAtlasBudget()
        frontend.reactivate()
        assert.equal(events.addonDisposed, 1)
    })

    it('reaches the @xterm/addon-webgl internals the atlas budget reads', () => {
        // The budget goes through private fields. If an upgrade renames them it would
        // silently stop working - fail here instead.
        const require = createRequire(import.meta.url)
        const source = readFileSync(require.resolve('@xterm/addon-webgl'), 'utf8')
        assert.match(source, /this\._charAtlas\s*=/, 'WebglRenderer no longer has _charAtlas')
        assert.match(source, /get pages\s*\(\)/, 'TextureAtlas no longer exposes pages')
    })

    it('sixel images use the configured per-terminal storage limit', () => {
        const source = readFileSync(path.join(terminalRoot, 'src/frontends/xtermFrontend.ts'), 'utf8')
        const file = ts.createSourceFile('xtermFrontend.ts', source, ts.ScriptTarget.Latest, true)
        let expression: string | undefined
        function visit (node: ts.Node) {
            if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'ImageAddon') {
                expression = node.getText(file)
            }
            ts.forEachChild(node, visit)
        }
        visit(file)
        assert.ok(expression, 'terminal creates an xterm image addon')
        const module = { exports: {} as any }
        vm.runInNewContext(compile(`module.exports = function () { return ${expression} }`), {
            module,
            exports: module.exports,
            ImageAddon: class { options: any; constructor (options: any) { this.options = options } },
        })
        const addon = module.exports.call({ configService: { store: { terminal: { imageStorageLimitMB: 32 } } } })
        assert.equal(addon.options?.storageLimit, 32)
    })
})
