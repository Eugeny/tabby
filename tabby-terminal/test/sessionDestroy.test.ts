import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BaseSession } from '../src/session.ts'

const logger = { debug () {}, info () {}, warn () {}, error () {}, log () {} } as any

class TestSession extends BaseSession {
    killed = 0

    constructor () {
        super(logger)
        this.open = true
    }

    async start (): Promise<void> { }
    resize (): void { }
    write (): void { }
    kill (): void { }
    async gracefullyKillProcess (): Promise<void> { this.killed++ }
    supportsWorkingDirectory (): boolean { return false }
    async getWorkingDirectory (): Promise<string|null> { return null }
}

describe('BaseSession.destroy()', () => {
    it('emits closed$ then destroyed$ and completes both', async () => {
        const session = new TestSession()
        const events: string[] = []
        session.closed$.subscribe({ next: () => events.push('closed'), complete: () => events.push('closed complete') })
        session.destroyed$.subscribe({ next: () => events.push('destroyed'), complete: () => events.push('destroyed complete') })

        await session.destroy()

        assert.deepEqual(events, ['closed', 'destroyed', 'closed complete', 'destroyed complete'])
        assert.equal(session.open, false)
    })

    it('still emits destroyed$ when a closed$ subscriber re-enters destroy()', async () => {
        // Closing a local tab: the tab reacts to closed$ and LocalTerminalTabComponent.ngOnDestroy()
        // calls session.destroy() again, synchronously. The local session removes its PTY IPC
        // listeners on destroyed$ - if that emission is lost, every closed session leaks.
        const session = new TestSession()
        let listenersRemoved = false
        session.destroyed$.subscribe(() => { listenersRemoved = true })
        session.closed$.subscribe(() => { session.destroy() })

        await session.destroy()

        assert.equal(listenersRemoved, true, 'destroyed$ was completed by the re-entrant call before it was emitted')
    })

    it('tears the process down only once when re-entered', async () => {
        const session = new TestSession()
        session.closed$.subscribe(() => { session.destroy() })

        await session.destroy()
        await session.destroy()

        assert.equal(session.killed, 1)
    })
})
