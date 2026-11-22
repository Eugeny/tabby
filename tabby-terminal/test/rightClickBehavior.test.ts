import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getRightClickBehavior } from '../src/helpers.ts'

describe('per-profile right-click behavior', () => {
    it('falls back to the global setting when the profile has no override', () => {
        assert.equal(getRightClickBehavior(undefined, 'menu'), 'menu')
        assert.equal(getRightClickBehavior(null, 'clipboard'), 'clipboard')
    })

    it('uses the profile override when one is set', () => {
        assert.equal(getRightClickBehavior('off', 'menu'), 'off')
        assert.equal(getRightClickBehavior('paste', 'clipboard'), 'paste')
    })
})
