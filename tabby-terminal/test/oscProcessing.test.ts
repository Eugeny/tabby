import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OSCProcessor } from '../src/middleware/oscProcessing.ts'

function setup () {
    const warnings: string[] = []
    const logger = { debug () {}, info () {}, warn: (msg: string) => warnings.push(msg), error () {}, log () {} } as any
    const osc = new OSCProcessor(logger)
    const out: Buffer[] = []
    const cwds: string[] = []
    osc.outputToTerminal$.subscribe(data => out.push(data))
    osc.cwdReported$.subscribe(cwd => cwds.push(cwd))
    const feed = (...chunks: (string|Buffer)[]) => chunks.forEach(c => osc.feedFromSession(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    const output = () => Buffer.concat(out).toString()
    return { feed, output, out, cwds, warnings }
}

describe('OSCProcessor', () => {
    it('keeps passing output through after an unterminated OSC introducer', () => {
        // A stray "ESC ]" followed by ordinary text with no BEL / ESC \ must not swallow the
        // stream (and re-concatenate the growing backlog on every chunk).
        const { feed, out } = setup()
        const chunk = Buffer.alloc(16 * 1024, 'plain log line with no terminator\n')
        const chunks = [Buffer.concat([Buffer.from('\x1b]'), chunk]), ...Array(191).fill(chunk)]
        feed(...chunks)
        const fed = chunks.reduce((n, c) => n + c.length, 0)
        const passed = out.reduce((n, c) => n + c.length, 0)
        assert.equal(passed, fed)
    })

    it('treats ESC followed by anything but "\\" as the end of an OSC, like xterm', () => {
        const { feed, output } = setup()
        feed('\x1b]0;broken\x1b[31mred\x1b[0m\r\n')
        assert.equal(output(), '\x1b]0;broken\x1b[31mred\x1b[0m\r\n')
    })

    it('treats CAN and SUB as the end of an OSC, like xterm', () => {
        const { feed, output } = setup()
        feed('\x1b]0;a\x18after CAN\r\n', '\x1b]0;b\x1aafter SUB\r\n')
        assert.equal(output(), '\x1b]0;a\x18after CAN\r\n\x1b]0;b\x1aafter SUB\r\n')
    })

    it('logs an unterminated OSC once per session', () => {
        const { feed, warnings } = setup()
        feed('\x1b]0;x\x1b[0m', '\x1b]0;y\x1b[0m')
        assert.equal(warnings.length, 1)
        assert.match(warnings[0], /Unterminated OSC sequence/)
    })

    it('still reassembles an OSC split across chunks', () => {
        const { feed, output } = setup()
        feed('\x1b]0;SPLIT')
        assert.equal(output(), '')
        feed('TITLE\x07prompt$ ')
        assert.equal(output(), '\x1b]0;SPLITTITLE\x07prompt$ ')
    })

    it('still waits when the ESC of an ESC \\ terminator ends a chunk', () => {
        const { feed, output } = setup()
        feed('\x1b]0;title\x1b')
        assert.equal(output(), '')
        feed('\\rest')
        assert.equal(output(), '\x1b]0;title\x1b\\rest')
    })

    it('still intercepts a split OSC 1337 CurrentDir report', () => {
        const { feed, output, cwds } = setup()
        feed('before\x1b]1337;Current', 'Dir=/tmp/work\x07after')
        assert.deepEqual(cwds, ['/tmp/work'])
        assert.equal(output(), 'beforeafter')
    })
})
