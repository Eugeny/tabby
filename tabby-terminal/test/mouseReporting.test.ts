import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    isRightButtonEvent,
    shouldDeferRightClickToApplication,
    MouseTrackingMode,
} from '../src/frontends/mouseReporting.ts'

describe('right-click handling while mouse reporting is active', () => {
    const modes: MouseTrackingMode[] = ['x10', 'vt200', 'drag', 'any']

    it('defers right-button press and release to the application in every tracking mode', () => {
        for (const mode of modes) {
            for (const type of ['mousedown', 'mouseup']) {
                assert.equal(
                    shouldDeferRightClickToApplication(mode, { type, which: 3, ctrlKey: false }),
                    true,
                    `${mode} ${type}`,
                )
            }
        }
    })

    it('defers Ctrl+left click, which is treated as a right-click on some platforms', () => {
        assert.equal(shouldDeferRightClickToApplication('vt200', {
            type: 'mousedown',
            which: 1,
            ctrlKey: true,
        }), true)
    })

    it('leaves the normal (no mouse reporting) context menu untouched', () => {
        assert.equal(shouldDeferRightClickToApplication('none', {
            type: 'mousedown',
            which: 3,
            ctrlKey: false,
        }), false)
        assert.equal(shouldDeferRightClickToApplication('none', {
            type: 'mouseup',
            which: 3,
            ctrlKey: false,
        }), false)
    })

    it('does not affect left- or middle-button events', () => {
        for (const mode of ['none', ...modes] as MouseTrackingMode[]) {
            assert.equal(shouldDeferRightClickToApplication(mode, {
                type: 'mousedown',
                which: 1,
                ctrlKey: false,
            }), false)
            assert.equal(shouldDeferRightClickToApplication(mode, {
                type: 'mousedown',
                which: 2,
                ctrlKey: false,
            }), false)
        }
    })

    it('recognizes the right button only for button 3 or Ctrl+left', () => {
        assert.equal(isRightButtonEvent({ type: 'mousedown', which: 3, ctrlKey: false }), true)
        assert.equal(isRightButtonEvent({ type: 'mousedown', which: 1, ctrlKey: true }), true)
        assert.equal(isRightButtonEvent({ type: 'mousedown', which: 1, ctrlKey: false }), false)
        assert.equal(isRightButtonEvent({ type: 'mousedown', which: 2, ctrlKey: true }), false)
    })
})
