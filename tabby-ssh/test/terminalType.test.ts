import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SSH_TERMINAL_TYPE, resolveSSHTerminalType } from '../src/session/terminalType.ts'

describe('resolveSSHTerminalType', () => {
    it('returns the custom terminal type when set', () => {
        assert.equal(resolveSSHTerminalType('vt100'), 'vt100')
        assert.equal(resolveSSHTerminalType('xterm'), 'xterm')
        assert.equal(resolveSSHTerminalType('linux'), 'linux')
    })

    it('falls back to xterm-256color for blank or whitespace-only values', () => {
        assert.equal(resolveSSHTerminalType(''), DEFAULT_SSH_TERMINAL_TYPE)
        assert.equal(resolveSSHTerminalType('   '), DEFAULT_SSH_TERMINAL_TYPE)
        assert.equal(resolveSSHTerminalType('\t\n'), DEFAULT_SSH_TERMINAL_TYPE)
    })

    it('falls back to xterm-256color when missing', () => {
        assert.equal(resolveSSHTerminalType(undefined), DEFAULT_SSH_TERMINAL_TYPE)
        assert.equal(resolveSSHTerminalType(null), DEFAULT_SSH_TERMINAL_TYPE)
        assert.equal(DEFAULT_SSH_TERMINAL_TYPE, 'xterm-256color')
    })

    it('trims surrounding whitespace from a custom value', () => {
        assert.equal(resolveSSHTerminalType('  vt100  '), 'vt100')
        assert.equal(resolveSSHTerminalType('\txterm-color\n'), 'xterm-color')
    })
})
