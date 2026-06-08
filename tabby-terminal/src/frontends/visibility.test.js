import assert from 'node:assert/strict'
import test from 'node:test'

import { syncTerminalVisibility } from './visibility.ts'

test('syncTerminalVisibility reactivates the frontend when the tab becomes visible', () => {
    let reactivated = 0
    let deactivated = 0

    syncTerminalVisibility({
        reactivateAfterVisibilityChange: () => {
            reactivated++
        },
        deactivateAfterVisibilityChange: () => {
            deactivated++
        },
    }, true)

    assert.equal(reactivated, 1)
    assert.equal(deactivated, 0)
})

test('syncTerminalVisibility releases hidden-tab resources when the tab becomes invisible', () => {
    let reactivated = 0
    let deactivated = 0

    syncTerminalVisibility({
        reactivateAfterVisibilityChange: () => {
            reactivated++
        },
        deactivateAfterVisibilityChange: () => {
            deactivated++
        },
    }, false)

    assert.equal(reactivated, 0)
    assert.equal(deactivated, 1)
})
