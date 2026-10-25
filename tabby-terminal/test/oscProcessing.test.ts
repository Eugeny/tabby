import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OSCProcessor, TerminalNotification, TerminalProgress } from '../src/middleware/oscProcessing.ts'

const MB = 1024 * 1024

function setup () {
    const processor = new OSCProcessor()
    const terminal: Buffer[] = []
    const session: Buffer[] = []
    const notifications: TerminalNotification[] = []
    const progress: (TerminalProgress|null)[] = []
    const closed: string[] = []
    processor.outputToTerminal$.subscribe(x => terminal.push(x))
    processor.outputToSession$.subscribe(x => session.push(x))
    processor.notificationRequested$.subscribe(x => notifications.push(x))
    processor.progressReported$.subscribe(x => progress.push(x))
    processor.notificationCloseRequested$.subscribe(x => closed.push(x))
    return {
        processor,
        notifications,
        progress,
        closed,
        feed: (...chunks: (string|Buffer)[]) => chunks.forEach(c => processor.feedFromSession(Buffer.from(c))),
        terminalOutput: () => Buffer.concat(terminal).toString(),
        sessionOutput: () => Buffer.concat(session).toString(),
    }
}

/** Feeds `input` split in two at every possible position */
function forEverySplit (input: string, check: (t: ReturnType<typeof setup>, at: number) => void) {
    const data = Buffer.from(input)
    for (let at = 0; at <= data.length; at++) {
        const t = setup()
        t.feed(data.subarray(0, at), data.subarray(at))
        check(t, at)
    }
}

describe('OSCProcessor stream parsing', () => {
    it('handles an OSC split at any position', () => {
        for (const terminator of ['\x07', '\x1b\\']) {
            forEverySplit(`before\x1b]9;hello${terminator}after`, (t, at) => {
                assert.deepEqual(t.notifications.map(n => n.body), ['hello'], `split at ${at}`)
                assert.equal(t.terminalOutput(), 'beforeafter', `split at ${at}`)
            })
        }
    })

    it('passes other escape sequences through unchanged wherever they are split', () => {
        const input = 'a\x1b[31mred\x1b[0m\x1b\x1b[1m\x1b]0;title\x07\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\\x1b\\z\x1b'
        forEverySplit(input, (t, at) => {
            assert.equal(t.terminalOutput(), input.slice(0, -1), `split at ${at}`)
        })
        // The trailing ESC is held back until it's clear that no OSC follows
        const t = setup()
        t.feed(input, 'x')
        assert.equal(t.terminalOutput(), input + 'x')
    })

    it('streams OSC sequences it does not handle without waiting for their end', () => {
        const t = setup()
        t.feed('\x1b]8;;https://')
        assert.equal(t.terminalOutput(), '\x1b]8;;https://')
        t.feed('example.com\x07')
        assert.equal(t.terminalOutput(), '\x1b]8;;https://example.com\x07')
    })

    it('ends an OSC at ESC and aborts it at CAN or SUB like xterm.js', () => {
        const t = setup()
        t.feed('\x1b]9;one\x1b[1m', '\x1b]9;two\x18x', '\x1b]9;three\x1ay')
        assert.deepEqual(t.notifications.map(n => n.body), ['one'])
        assert.equal(t.terminalOutput(), '\x1b[1mxy')
    })

    it('passes ConEmu subcommands it does not handle through', () => {
        forEverySplit('\x1b]9;9;/home/user\x1b\\', (t, at) => {
            assert.equal(t.terminalOutput(), '\x1b]9;9;/home/user\x1b\\', `split at ${at}`)
            assert.equal(t.notifications.length, 0)
        })
    })

    it('collects a long unterminated OSC in linear time', () => {
        const t = setup()
        const chunk = Buffer.alloc(16 * 1024, 'A')
        const realConcat = Buffer.concat
        let copied = 0
        Buffer.concat = ((list: readonly Uint8Array[], length?: number) => {
            const result = realConcat(list, length)
            copied += result.length
            return result
        }) as typeof Buffer.concat
        try {
            t.feed('\x1b]52;c;')
            for (let i = 0; i < 128; i++) {   // 2 MB
                t.processor.feedFromSession(chunk)
            }
        } finally {
            Buffer.concat = realConcat
        }
        assert.ok(copied <= 2 * 2 * MB, `copied ${Math.round(copied / MB)} MB to buffer 2 MB`)
        assert.equal(t.terminalOutput(), '')
    })

    it('passes an OSC that grows past the limit through and recovers', () => {
        const t = setup()
        const chunk = Buffer.alloc(MB, 'A')
        t.feed('\x1b]52;c;')
        for (let i = 0; i < 9; i++) {
            t.processor.feedFromSession(chunk)
        }
        t.feed('\x07after')
        const output = t.terminalOutput()
        assert.equal(output.length, '\x1b]52;c;'.length + 9 * MB + '\x07after'.length)
        assert.ok(output.startsWith('\x1b]52;c;AAAA'))
        assert.ok(output.endsWith('AAAA\x07after'))
    })
})

describe('OSCProcessor OSC 9;4 progress', () => {
    it('reports every state', () => {
        const t = setup()
        t.feed('\x1b]9;4;1;42\x07', '\x1b]9;4;3\x07', '\x1b]9;4;2\x07', '\x1b]9;4;4;150\x07', '\x1b]9;4;1\x07', '\x1b]9;4;0\x07')
        assert.deepEqual(t.progress, [
            { state: 'normal', value: 42 },
            { state: 'indeterminate', value: null },
            { state: 'error', value: 42 },
            { state: 'paused', value: 100 },
            { state: 'normal', value: 0 },
            null,
        ])
        assert.equal(t.terminalOutput(), '')
        assert.equal(t.notifications.length, 0)
    })
})

describe('OSCProcessor OSC 52', () => {
    it('does not treat a clipboard query as a copy', () => {
        const t = setup()
        const copies: string[] = []
        t.processor.copyRequested$.subscribe(x => copies.push(x))
        t.feed('\x1b]52;c;?\x07', `\x1b]52;c;${Buffer.from('copied').toString('base64')}\x07`)
        assert.deepEqual(copies, ['copied'])
    })
})

describe('OSCProcessor OSC 99 (kitty) notifications', () => {
    it('joins chunks sharing an id', () => {
        const t = setup()
        t.feed('\x1b]99;i=1:d=0;Hello\x1b\\', '\x1b]99;i=1:d=0:p=body;Body\x1b\\', `\x1b]99;i=1:e=1:p=body;${Buffer.from(' text').toString('base64')}\x1b\\`)
        assert.equal(t.notifications.length, 1)
        assert.equal(t.notifications[0].title, 'Hello')
        assert.equal(t.notifications[0].body, 'Body text')
        assert.equal(t.notifications[0].id, '1')
    })

    it('uses the title as the body when there is no body', () => {
        const t = setup()
        t.feed('\x1b]99;;Done\x1b\\')
        assert.equal(t.notifications[0].body, 'Done')
        assert.equal(t.notifications[0].title, undefined)
    })

    it('answers a capability query with a sanitized id', () => {
        const t = setup()
        t.feed('\x1b]99;i=q<1>:p=?;\x1b\\')
        assert.equal(t.sessionOutput(), '\x1b]99;i=q1:p=?;a=focus,report:o=unfocused,invisible:p=title,body,close,?\x1b\\')
        assert.equal(t.terminalOutput(), '')
        assert.equal(t.notifications.length, 0)
    })

    it('reads the occasion and click actions', () => {
        const t = setup()
        t.feed('\x1b]99;i=a:o=invisible:a=-focus,report;Hi\x1b\\', '\x1b]99;;Plain\x1b\\')
        assert.equal(t.notifications[0].occasion, 'invisible')
        assert.equal(t.notifications[0].focusOnClick, false)
        assert.equal(t.notifications[0].reportClick, true)
        assert.equal(t.notifications[1].occasion, 'unfocused')
        assert.equal(t.notifications[1].focusOnClick, true)
        assert.equal(t.notifications[1].reportClick, false)
    })

    it('reports clicks and forwards close requests', () => {
        const t = setup()
        t.processor.reportNotificationClick('a')
        t.processor.reportNotificationClick(undefined)
        assert.equal(t.sessionOutput(), '\x1b]99;i=a;\x1b\\\x1b]99;i=0;\x1b\\')
        t.feed('\x1b]99;i=a:p=close;\x1b\\', '\x1b]99;p=close;\x1b\\')
        assert.deepEqual(t.closed, ['a'])
    })

    it('limits incomplete notifications', () => {
        const t = setup()
        for (let i = 0; i < 100; i++) {
            t.feed(`\x1b]99;i=n${i}:d=0;${'x'.repeat(4000)}\x1b\\`)
        }
        for (let i = 0; i < 4; i++) {
            t.feed(`\x1b]99;i=n99:d=0;${'x'.repeat(4000)}\x1b\\`)
        }
        t.feed('\x1b]99;i=n0;done\x1b\\', '\x1b]99;i=n99;\x1b\\')
        // n0 was evicted long ago, so only its last chunk is shown
        assert.equal(t.notifications[0].body, 'done')
        assert.equal(t.notifications[1].body.length, 8 * 1024)
    })
})
