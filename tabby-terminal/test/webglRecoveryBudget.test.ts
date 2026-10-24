import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { WebGLRecoveryBudget, MAX_WEBGL_RECOVERY_ATTEMPTS, WEBGL_RECOVERY_WINDOW_MS } from '../src/frontends/webglRecoveryBudget.ts'

function budgetWithClock () {
    let now = 0
    const budget = new WebGLRecoveryBudget(MAX_WEBGL_RECOVERY_ATTEMPTS, WEBGL_RECOVERY_WINDOW_MS, () => now)
    return {
        budget,
        setTime: (t: number) => { now = t },
    }
}

describe('WebGLRecoveryBudget', () => {
    it('allows up to the configured attempts within the window', () => {
        const { budget } = budgetWithClock()
        assert.equal(budget.trySpend(), true)
        assert.equal(budget.trySpend(), true)
        assert.equal(budget.trySpend(), true)
        assert.equal(budget.trySpend(), false, 'budget should be exhausted within the window')
    })

    it('re-arms once the attempts age out of the window', () => {
        const { budget, setTime } = budgetWithClock()
        budget.trySpend()
        budget.trySpend()
        budget.trySpend()
        setTime(1000)
        assert.equal(budget.trySpend(), false, 'still inside the window: exhausted')
        setTime(WEBGL_RECOVERY_WINDOW_MS + 60_000)
        assert.equal(budget.trySpend(), true, 'aged-out attempts must re-arm the budget')
    })

    it('expireOldAttempts re-arms without spending an attempt', () => {
        const { budget, setTime } = budgetWithClock()
        budget.trySpend()
        budget.trySpend()
        budget.trySpend()
        setTime(1000)
        assert.equal(budget.trySpend(), false, 'in-window budget is exhausted')
        setTime(WEBGL_RECOVERY_WINDOW_MS + 1)
        budget.expireOldAttempts()
        assert.equal(budget.trySpend(), true, 'reactivate() should re-arm without consuming budget')
    })

    it('partial aging restores only the aged-out attempts', () => {
        const { budget, setTime } = budgetWithClock()
        budget.trySpend()
        setTime(300_000)
        budget.trySpend()
        setTime(310_000)
        budget.trySpend()
        assert.equal(budget.trySpend(), false, 'three in-window attempts fill the budget')
        setTime(660_000)
        assert.equal(budget.trySpend(), true, 'the aged-out attempt frees one slot')
        assert.equal(budget.trySpend(), false, 'in-window attempts must still count after partial aging')
    })
})
