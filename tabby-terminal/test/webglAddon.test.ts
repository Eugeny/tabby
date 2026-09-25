import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import { disposeWebglAddon } from '../src/frontends/webglAddon.ts'

function fakeAddon (calls: string[], renderer: unknown = {
    _cursorBlinkStateManager: { dispose: () => calls.push('blink manager') },
}): any {
    return { _renderer: renderer, dispose: () => calls.push('addon') }
}

describe('disposeWebglAddon', () => {
    it('disposes the renderer\'s cursor blink manager before the addon', () => {
        // addon-webgl <= 0.19 never disposes it, and its blink interval keeps the whole
        // terminal of every closed tab alive.
        const calls: string[] = []
        disposeWebglAddon(fakeAddon(calls))
        assert.deepEqual(calls, ['blink manager', 'addon'])
    })

    it('still disposes the addon when the renderer internals are missing or throw', () => {
        const calls: string[] = []
        disposeWebglAddon(fakeAddon(calls, null))
        disposeWebglAddon(fakeAddon(calls, {}))
        disposeWebglAddon(fakeAddon(calls, { _cursorBlinkStateManager: { dispose: () => { throw new Error('boom') } } }))
        assert.deepEqual(calls, ['addon', 'addon', 'addon'])
    })

    it('accepts a missing addon', () => {
        disposeWebglAddon(undefined)
    })

    it('reaches internals that the installed @xterm/addon-webgl still has', () => {
        // The workaround goes through private fields. If an upgrade renames them it would
        // silently stop disposing the timer - fail here instead.
        const require = createRequire(import.meta.url)
        const source = readFileSync(require.resolve('@xterm/addon-webgl'), 'utf8')
        assert.match(source, /this\._renderer\s*=/, 'WebglAddon no longer has _renderer')
        assert.match(source, /this\._cursorBlinkStateManager\s*=/, 'WebglRenderer no longer has _cursorBlinkStateManager')
    })
})
