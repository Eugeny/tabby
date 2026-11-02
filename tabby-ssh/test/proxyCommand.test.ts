import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseProxyCommand } from '../src/session/proxyCommand.ts'

test('expands host and custom or default ports', () => {
    assert.deepEqual(parseProxyCommand('nc %h %p', 'host.example', 2222), ['nc', 'host.example', '2222'])
    assert.deepEqual(parseProxyCommand('nc %h %p', 'host.example', null), ['nc', 'host.example', '22'])
})

test('expands the user name like OpenSSH and leaves it empty when the profile has none', () => {
    assert.deepEqual(parseProxyCommand('ssh -W %h:%p -l %r jump', 'host.example', 22, 'alice'),
        ['ssh', '-W', 'host.example:22', '-l', 'alice', 'jump'])
    assert.deepEqual(parseProxyCommand('tool %r', 'host.example', 22), ['tool', ''])
    assert.deepEqual(parseProxyCommand('tool %r', 'host.example', 22, null), ['tool', ''])
})

test('trims the host before expanding it', () => {
    assert.deepEqual(parseProxyCommand('nc %h %p', '  host.example ', 22), ['nc', 'host.example', '22'])
})

test('rejects %h when the profile has no host but still runs commands that do not use it', () => {
    assert.throws(() => parseProxyCommand('nc %h %p', '   ', 22), /uses %h but the profile has no host/)
    assert.deepEqual(parseProxyCommand('ssh -W target:22 jump', '', 22), ['ssh', '-W', 'target:22', 'jump'])
    assert.deepEqual(parseProxyCommand('tool %%h', '', 22), ['tool', '%h'])
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
    assert.deepEqual(parseProxyCommand('tool %%h %h %% %x', 'host', 22), ['tool', '%h', 'host', '%', '%x'])
})

test('continues to reject shell operators and empty commands', () => {
    for (const command of ['nc %h %p | other', 'a && b', 'a > file']) {
        assert.throws(() => parseProxyCommand(command, 'host', 22), /shell operators/)
    }
    assert.throws(() => parseProxyCommand('   ', 'host', 22), /empty/)
})
