import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldRegisterTabbyProtocol } from '../../app/lib/protocolRegistration'

describe('tabby:// scheme registration decision', () => {
    it('skips registration on Linux when Tabby is already the handler', () => {
        assert.equal(shouldRegisterTabbyProtocol('linux', () => true), false)
    })

    it('still registers on Linux when Tabby is not the handler yet', () => {
        assert.equal(shouldRegisterTabbyProtocol('linux', () => false), true)
    })

    it('keeps unconditional registration on macOS and Windows', () => {
        const unexpectedQuery = (): boolean => { throw new Error('should not query the default client') }
        for (const platform of ['darwin', 'win32']) {
            assert.equal(shouldRegisterTabbyProtocol(platform, unexpectedQuery), true)
        }
    })
})
