import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_SSH_TERMINAL_TYPE, openShellChannelForProfile, requestShellPTY } from '../src/session/shellChannel.ts'
import type { SSHShellChannelOptions } from '../src/session/shellChannel.ts'

class SharedSSHSessionAdapter {
    readonly channelOptions: SSHShellChannelOptions[] = []
    readonly requestedTerms: string[] = []

    async openShellChannel (options: SSHShellChannelOptions): Promise<void> {
        this.channelOptions.push(options)
        await requestShellPTY({
            requestPTY: async term => {
                this.requestedTerms.push(term)
            },
        }, options)
    }
}

describe('shared SSH session shell channels', () => {
    it('uses each shell profile TERM and applies the blank fallback', async () => {
        const sharedSession = new SharedSSHSessionAdapter()

        await openShellChannelForProfile(sharedSession, { options: { x11: false, term: '  vt100  ' } })
        await openShellChannelForProfile(sharedSession, { options: { x11: true, term: 'xterm' } })
        await openShellChannelForProfile(sharedSession, { options: { x11: false, term: '   ' } })

        assert.deepEqual(sharedSession.channelOptions, [
            { x11: false, term: '  vt100  ' },
            { x11: true, term: 'xterm' },
            { x11: false, term: '   ' },
        ])
        assert.deepEqual(sharedSession.requestedTerms, [
            'vt100',
            'xterm',
            'xterm-256color',
        ])
    })

    it('falls back for a malformed persisted TERM value', async () => {
        const sharedSession = new SharedSSHSessionAdapter()
        const profile = { options: { x11: false, term: 256 } } as unknown as Parameters<typeof openShellChannelForProfile>[1]

        await openShellChannelForProfile(sharedSession, profile)

        assert.deepEqual(sharedSession.requestedTerms, [DEFAULT_SSH_TERMINAL_TYPE])
    })
})
