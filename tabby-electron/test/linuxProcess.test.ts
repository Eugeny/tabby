import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { getLinuxChildProcesses, parseLinuxProcess } from '../src/linuxProcess.ts'

describe('Linux process output', () => {
    it('matches the full parent PID and preserves command paths and arguments', () => {
        assert.equal(parseLinuxProcess('12 142 /usr/bin/sleep 60', 42), null)
        assert.equal(parseLinuxProcess('12 420 /usr/bin/sleep 60', 42), null)
        assert.deepEqual(parseLinuxProcess('  123  42 /usr/bin/example --label café 世界', 42), {
            pid: 123, ppid: 42, command: '/usr/bin/example', arguments: ['--label', 'café', '世界'],
        })
        assert.deepEqual(parseLinuxProcess('123 42 [worker]', 42), {
            pid: 123, ppid: 42, command: '[worker]', arguments: [],
        })
        assert.equal(parseLinuxProcess('PID PPID COMMAND', 42), null)
        assert.equal(parseLinuxProcess('', 42), null)
    })

    it('rejects invalid parent IDs without listing unrelated processes', async () => {
        for (const id of [0, -1, NaN, Infinity, 1.5]) {
            assert.deepEqual(await getLinuxChildProcesses(id), [])
        }
    })
})

async function withPS (script: string, callback: () => Promise<void>): Promise<void> {
    const dir = await mkdtemp(join(tmpdir(), 'tabby-ps-test-'))
    const originalPATH = process.env.PATH
    try {
        await writeFile(join(dir, 'ps'), `#!/bin/sh\n${script}\n`, { mode: 0o755 })
        process.env.PATH = dir
        await callback()
    } finally {
        if (originalPATH === undefined) {
            delete process.env.PATH
        } else {
            process.env.PATH = originalPATH
        }
        await rm(dir, { recursive: true, force: true })
    }
}

describe('process enumeration failures', { skip: process.platform === 'win32' }, () => {
    it('handles the no-match exit status', async () => {
        await withPS('exit 1', async () => {
            assert.deepEqual(await getLinuxChildProcesses(42), [])
        })
    })

    it('reports command failures instead of presenting an empty process list', async () => {
        await withPS('printf "ps failed\\n" >&2; exit 2', async () => {
            await assert.rejects(getLinuxChildProcesses(42), /ps failed/)
        })
        await withPS('printf "no permission\\n" >&2; exit 1', async () => {
            await assert.rejects(getLinuxChildProcesses(42), /no permission/)
        })
    })

    it('reports spawn errors', async () => {
        await withPS('', async () => {
            await rm(join(process.env.PATH!, 'ps'))
            await assert.rejects(getLinuxChildProcesses(42), { code: 'ENOENT' })
        })
    })

    it('reads the last unterminated line and excludes other parents', async () => {
        await withPS('printf " 10 142 /bin/other\\n 11 42 /bin/child arg"', async () => {
            assert.deepEqual(await getLinuxChildProcesses(42), [
                { pid: 11, ppid: 42, command: '/bin/child', arguments: ['arg'] },
            ])
        })
    })
})

describe('real Linux processes', { skip: process.platform !== 'linux' }, () => {
    it('preserves long arguments without a fixed stdout-buffer limit', async () => {
        const argument = 'long-argument-'.repeat(3100)
        const children = Array.from({ length: 28 }, () => spawn('/bin/sh', [
            '-c', 'read line', 'tabby-process-fixture', argument,
        ], { stdio: ['pipe', 'ignore', 'ignore'] }))
        try {
            await Promise.all(children.map(child => once(child, 'spawn')))
            const processes = await getLinuxChildProcesses(process.pid)
            assert.ok(argument.length * children.length > 1024 * 1024)
            for (const child of children) {
                const found = processes.find(p => p.pid === child.pid)
                assert.ok(found, `Child ${child.pid} was listed`)
                assert.equal(found.ppid, process.pid)
                assert.ok((found as typeof found & { arguments: string[] }).arguments.includes(argument))
            }
            assert.ok(processes.every(p => p.ppid === process.pid))
        } finally {
            for (const child of children) {
                child.kill()
            }
            await Promise.all(children.map(child => child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : once(child, 'exit')))
        }
    })

    it('returns no children for a nonexistent parent', async () => {
        assert.deepEqual(await getLinuxChildProcesses(2147483647), [])
    })
})
