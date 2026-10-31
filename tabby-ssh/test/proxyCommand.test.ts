import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseProxyCommand } from '../src/session/proxyCommand.ts'

test('expands host and custom or default ports', () => {
    assert.deepEqual(parseProxyCommand('nc %h %p', 'host.example', 2222), ['nc', 'host.example', '2222'])
    assert.deepEqual(parseProxyCommand('nc %h %p', 'host.example', null), ['nc', 'host.example', '22'])
})

test('expands combined and quoted arguments without changing argument boundaries', () => {
    assert.deepEqual(parseProxyCommand('"/path with spaces/ssh" -W "%h:%p" jump', '::1', 2200),
        ['/path with spaces/ssh', '-W', '::1:2200', 'jump'])
})

test('does not parse inserted host data as command syntax or expand it twice', () => {
    const host = 'host; \'two words\' %p'
    assert.deepEqual(parseProxyCommand('nc %h %p', host, 2222), ['nc', host, '2222'])
})

test('supports literal percent and preserves unrelated placeholders', () => {
    assert.deepEqual(parseProxyCommand('tool %%h %h %% %r', 'host', 22), ['tool', '%h', 'host', '%', '%r'])
})

test('continues to reject shell operators and empty commands', () => {
    for (const command of ['nc %h %p | other', 'a && b', 'a > file']) {
        assert.throws(() => parseProxyCommand(command, 'host', 22), /shell operators/)
    }
    assert.throws(() => parseProxyCommand('   ', 'host', 22), /empty/)
})
