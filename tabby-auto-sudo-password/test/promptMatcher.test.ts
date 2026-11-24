import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SudoPromptMatcher } from '../src/promptMatcher'

for (const [prompt, username] of [
    ['[sudo] password for test: ', 'test'],
    ['[sudo] Mot de passe de élève : ', 'élève'],
    ['[sudo] 用户 的密码：', '用户'],
    ['[sudo: authenticate] Password: ', ''],
]) {
    test(`recognizes every byte split of ${prompt}`, () => {
        const data = Buffer.from(prompt.trimEnd())
        for (let split = 1; split < data.length; split++) {
            const matcher = new SudoPromptMatcher()
            assert.equal(matcher.push(data.subarray(0, split)), null)
            assert.equal(matcher.push(data.subarray(split)), username)
        }
    })
}

test('recognizes one-byte fragments and does not rematch trailing whitespace', () => {
    const matcher = new SudoPromptMatcher(), matches: string[] = []
    for (const byte of Buffer.from('[sudo] password for test: ')) {
        const result = matcher.push(Buffer.from([byte]))
        if (result !== null) {
            matches.push(result)
        }
    }
    assert.deepEqual(matches, ['test'])
    assert.equal(matcher.push(Buffer.from('   ')), null)
})

test('only matches the current line and resets on carriage return', () => {
    const matcher = new SudoPromptMatcher()
    assert.equal(matcher.push(Buffer.from('[sudo] password for old: \nnormal output')), null)
    assert.equal(matcher.push(Buffer.from('\r[sudo] password for new: ')), 'new')
})

test('bounds long lines and recovers at the next newline', () => {
    const matcher = new SudoPromptMatcher()
    matcher.push(Buffer.alloc(1024 * 1024, 120))
    assert.equal(matcher.push(Buffer.from('[sudo] password for test: ')), null)
    assert.equal(matcher.push(Buffer.from('\n[sudo] password for test: ')), 'test')
})

test('input reset prevents a partial prompt from spanning an interaction', () => {
    const matcher = new SudoPromptMatcher()
    matcher.push(Buffer.from('[sudo] password for '))
    matcher.reset()
    assert.equal(matcher.push(Buffer.from('test: ')), null)
})
