import assert from 'node:assert/strict'
import test from 'node:test'
import { selectNextAuthMethod, updateAuthPlanAfterFailure } from '../src/session/authMethodSelection.ts'

interface Method {
    type: 'keyboard-interactive'|'password'|'publickey'
}

const authType = (method: Method): string => method.type

const createPartialSuccessFallback = (type: string): Method|null => {
    if (type === 'keyboard-interactive') {
        return { type }
    }
    return null
}

test('continues with keyboard-interactive after partial public-key success', () => {
    let remainingMethods: Method[] = [{ type: 'publickey' }]
    let allowedMethods = ['publickey']

    const publicKey = selectNextAuthMethod(remainingMethods, allowedMethods, authType)
    assert.equal(publicKey?.type, 'publickey')
    remainingMethods = remainingMethods.filter(method => method !== publicKey)

    const plan = updateAuthPlanAfterFailure(
        remainingMethods,
        {
            partialSuccess: true,
            remainingMethods: ['keyboard-interactive'],
        },
        authType,
        createPartialSuccessFallback,
    )
    allowedMethods = plan.allowedMethods

    assert.equal(selectNextAuthMethod(plan.remainingMethods, allowedMethods, authType)?.type, 'keyboard-interactive')
})

test('does not add keyboard-interactive after a full public-key rejection', () => {
    const plan = updateAuthPlanAfterFailure(
        [],
        {
            partialSuccess: false,
            remainingMethods: ['keyboard-interactive'],
        },
        authType,
        createPartialSuccessFallback,
    )

    assert.equal(selectNextAuthMethod(plan.remainingMethods, plan.allowedMethods, authType), undefined)
})

test('selects public-key for a public-key-only server', () => {
    const method = selectNextAuthMethod<Method>(
        [{ type: 'publickey' }, { type: 'keyboard-interactive' }],
        ['publickey'],
        authType,
    )

    assert.equal(method?.type, 'publickey')
})

test('selects keyboard-interactive when it is the only advertised method', () => {
    const method = selectNextAuthMethod<Method>(
        [{ type: 'publickey' }, { type: 'keyboard-interactive' }],
        ['keyboard-interactive'],
        authType,
    )

    assert.equal(method?.type, 'keyboard-interactive')
})

test('selects only methods advertised by the server', () => {
    const method = selectNextAuthMethod<Method>(
        [{ type: 'password' }, { type: 'publickey' }, { type: 'keyboard-interactive' }],
        ['keyboard-interactive'],
        authType,
    )

    assert.equal(method?.type, 'keyboard-interactive')
})

test('stops when the server advertises no remaining methods', () => {
    const plan = updateAuthPlanAfterFailure(
        [{ type: 'publickey' }] satisfies Method[],
        {
            partialSuccess: false,
            remainingMethods: [],
        },
        authType,
        createPartialSuccessFallback,
    )

    assert.deepEqual(plan.allowedMethods, [])
    assert.equal(selectNextAuthMethod(plan.remainingMethods, plan.allowedMethods, authType), undefined)
})
