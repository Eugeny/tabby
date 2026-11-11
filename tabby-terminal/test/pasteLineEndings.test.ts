import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizePasteLineEndings } from '../src/helpers.ts'

describe('normalizePasteLineEndings', () => {
    it('normalizes bare LF to CR without altering surrounding text', () => {
        assert.equal(normalizePasteLineEndings('alpha\nbeta'), 'alpha\rbeta')
    })

    it('normalizes CRLF to a single CR instead of CR CR', () => {
        assert.equal(normalizePasteLineEndings('alpha\r\nbeta'), 'alpha\rbeta')
    })

    it('preserves consecutive blank lines and mixed line endings', () => {
        assert.equal(normalizePasteLineEndings('a\n\nb\r\n\nc\r'), 'a\r\rb\r\rc\r')
    })

    it('preserves UTF-8 non-ASCII text and empty input', () => {
        assert.equal(normalizePasteLineEndings(''), '')
        assert.equal(normalizePasteLineEndings('привет\nмир\r\n'), 'привет\rмир\r')
    })
})
