import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getScreenText, ScreenBuffer } from '../src/frontends/screenText.ts'

function buffer (lines: (string|undefined)[], viewportY = 0, length = lines.length): ScreenBuffer {
    return {
        viewportY,
        length,
        getLine: y => {
            const value = lines[y]
            return value === undefined ? undefined : {
                translateToString: (trimRight?: boolean) => trimRight ? value.replace(/\s+$/, '') : value,
            }
        },
    }
}

describe('getScreenText', () => {
    it('returns the visible rows joined by newlines, with trailing whitespace trimmed', () => {
        const b = buffer(['first', 'second  ', 'third'])
        assert.equal(getScreenText(b, 3), 'first\nsecond\nthird')
    })

    it('starts at the viewport, ignoring scrollback above it', () => {
        const b = buffer(['hidden', 'visible', 'also visible'], 1)
        assert.equal(getScreenText(b, 2), 'visible\nalso visible')
    })

    it('drops trailing blank rows but keeps interior ones', () => {
        const b = buffer(['line', '', 'more', '', ''])
        assert.equal(getScreenText(b, 5), 'line\n\nmore')
    })

    it('does not read past the buffer length or the visible row count', () => {
        const b = buffer(['a', 'b', 'c'], 1)
        assert.equal(getScreenText(b, 10), 'b\nc')
    })

    it('returns an empty string for a blank or unavailable screen', () => {
        assert.equal(getScreenText(buffer(['', '', '']), 3), '')
        assert.equal(getScreenText(buffer([undefined, undefined], 0, 0), 5), '')
    })
})
