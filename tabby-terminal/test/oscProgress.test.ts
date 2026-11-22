import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OSCProcessor, parseOSC94Progress } from '../src/middleware/oscProcessing.ts'

describe('parseOSC94Progress', () => {
    it('parses the five OSC 9;4 states', () => {
        assert.deepEqual(parseOSC94Progress('9;4;0'), { state: 0, progress: null })
        assert.deepEqual(parseOSC94Progress('9;4;1;50'), { state: 1, progress: 50 })
        assert.deepEqual(parseOSC94Progress('9;4;2;75'), { state: 2, progress: 75 })
        assert.deepEqual(parseOSC94Progress('9;4;3'), { state: 3, progress: null })
        assert.deepEqual(parseOSC94Progress('9;4;4;25'), { state: 4, progress: 25 })
    })

    it('clamps percentages into the 0-100 range', () => {
        assert.deepEqual(parseOSC94Progress('9;4;1;-10'), { state: 1, progress: 0 })
        assert.deepEqual(parseOSC94Progress('9;4;1;150'), { state: 1, progress: 100 })
    })

    it('accepts fractional percentages', () => {
        assert.deepEqual(parseOSC94Progress('9;4;1;12.5'), { state: 1, progress: 12.5 })
    })

    it('rejects payloads that are not OSC 9;4 progress reports', () => {
        assert.equal(parseOSC94Progress('9;5;hello'), null)
        assert.equal(parseOSC94Progress('1337;CurrentDir=/tmp'), null)
        assert.equal(parseOSC94Progress('9;4'), null)
        assert.equal(parseOSC94Progress('9;4;5;50'), null)
        assert.equal(parseOSC94Progress('9;4;1.5;50'), null)
        assert.equal(parseOSC94Progress('9;4;1'), null)
        assert.equal(parseOSC94Progress('9;4;1;abc'), null)
    })

    it('ignores a trailing progress value on states that do not use one', () => {
        assert.deepEqual(parseOSC94Progress('9;4;0;99'), { state: 0, progress: null })
        assert.deepEqual(parseOSC94Progress('9;4;3;99'), { state: 3, progress: null })
    })
})

describe('OSCProcessor progress reporting', () => {
    it('consumes OSC 9;4 and emits the reported progress', () => {
        const processor = new OSCProcessor()
        const visible: string[] = []
        const reported: unknown[] = []
        processor.outputToTerminal$.subscribe(data => visible.push(data.toString()))
        processor.progressReported$.subscribe(progress => reported.push(progress))

        processor.feedFromSession(Buffer.from('before\x1b]9;4;1;50\x07after'))
        processor.feedFromSession(Buffer.from('more\x1b]9;4;0\x1b\\end'))

        assert.equal(visible.join(''), 'beforeaftermoreend')
        assert.deepEqual(reported, [
            { state: 1, progress: 50 },
            { state: 0, progress: null },
        ])
    })

    it('passes other OSC 9 sequences through as terminal output', () => {
        const processor = new OSCProcessor()
        const visible: string[] = []
        const reported: unknown[] = []
        processor.outputToTerminal$.subscribe(data => visible.push(data.toString()))
        processor.progressReported$.subscribe(progress => reported.push(progress))

        processor.feedFromSession(Buffer.from('a\x1b]9;notification\x07b'))

        assert.equal(visible.join(''), 'a\x1b]9;notification\x07b')
        assert.equal(reported.length, 0)
    })

    it('handles a progress sequence split across chunks', () => {
        const processor = new OSCProcessor()
        const visible: string[] = []
        const reported: unknown[] = []
        processor.outputToTerminal$.subscribe(data => visible.push(data.toString()))
        processor.progressReported$.subscribe(progress => reported.push(progress))

        processor.feedFromSession(Buffer.from('\x1b]9;4;1;'))
        processor.feedFromSession(Buffer.from('42\x07'))

        assert.equal(visible.join(''), '')
        assert.deepEqual(reported, [{ state: 1, progress: 42 }])
    })

    it('completes the progress stream on close', () => {
        const processor = new OSCProcessor()
        let completed = false
        processor.progressReported$.subscribe({ complete: () => { completed = true } })
        processor.close()
        assert.equal(completed, true)
    })
})
