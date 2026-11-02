import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { writeSFTPUpload } from '../src/session/sftpUpload.ts'

function fixture (permissions: number|null|undefined|Error) {
    const events: string[] = []
    const warnings: [string, unknown][] = []
    const source = [new Uint8Array([1, 2, 3]), new Uint8Array()]
    const file = {
        write: async (_chunk: Uint8Array) => { events.push('write') },
        close: async () => { events.push('close') },
    }
    const target = {
        stat: async () => {
            events.push('stat')
            if (permissions instanceof Error) { throw permissions }
            return { permissions }
        },
        open: async () => {
            events.push('open')
            return file
        },
        chmod: async (mode: number) => { events.push(`chmod:${mode.toString(8)}`) },
        warn: (message: string, error: unknown) => { warnings.push([message, error]) },
    }
    return { target, file, source: { read: async () => source.shift()! }, events, warnings }
}

describe('SFTP upload permissions', () => {
    for (const mode of [0o755, 0o600, 0o644, 0]) {
        it(`preserves mode ${mode.toString(8)} before writing`, async () => {
            const f = fixture(0o100000 | mode)
            await writeSFTPUpload(f.target, f.source)
            assert.deepEqual(f.events, ['stat', 'open', `chmod:${mode.toString(8)}`, 'write', 'close'])
            assert.deepEqual(f.warnings, [])
        })
    }

    it('keeps server defaults without a warning when the destination does not exist', async () => {
        const f = fixture(new Error('Status(Status { id: 1, status_code: NoSuchFile, error_message: "No such file" })'))
        await writeSFTPUpload(f.target, f.source)
        assert.deepEqual(f.events, ['stat', 'open', 'write', 'close'])
        assert.deepEqual(f.warnings, [])
    })

    it('does not invent permissions when the server omits them', async () => {
        const f = fixture(undefined)
        await writeSFTPUpload(f.target, f.source)
        assert.deepEqual(f.events, ['stat', 'open', 'write', 'close'])
        assert.deepEqual(f.warnings, [])
    })

    for (const message of [
        'Status(Status { status_code: PermissionDenied, error_message: "NoSuchFile" })',
        'Status(Status { status_code: Failure, error_message: "Failure" })',
        'connection lost',
    ]) {
        it(`uploads with server defaults and warns once when stat fails with ${message}`, async () => {
            const error = new Error(message)
            const f = fixture(error)
            await writeSFTPUpload(f.target, f.source)
            assert.deepEqual(f.events, ['stat', 'open', 'write', 'close'])
            assert.equal(f.warnings.length, 1)
            assert.match(f.warnings[0][0], /permissions/)
            assert.equal(f.warnings[0][1], error)
        })
    }

    it('works without a warning callback', async () => {
        const f = fixture(new Error('connection lost'))
        const target = { stat: f.target.stat, open: f.target.open, chmod: f.target.chmod }
        await writeSFTPUpload(target, f.source)
        assert.deepEqual(f.events, ['stat', 'open', 'write', 'close'])
    })

    it('closes without writing when chmod fails on an existing file', async () => {
        const f = fixture(0o600)
        f.target.chmod = async () => { throw new Error('chmod denied') }
        await assert.rejects(writeSFTPUpload(f.target, f.source), /chmod denied/)
        assert.deepEqual(f.events, ['stat', 'open', 'close'])
        assert.deepEqual(f.warnings, [])
    })

    it('closes the handle when reading or writing fails', async () => {
        const f = fixture(0o755)
        f.source.read = async () => { throw new Error('local read failed') }
        await assert.rejects(writeSFTPUpload(f.target, f.source), /local read failed/)
        assert.equal(f.events.at(-1), 'close')
    })

    it('reports the write error when closing the handle fails as well', async () => {
        const f = fixture(0o755)
        const closeError = new Error('close failed')
        f.file.write = async () => { throw new Error('write failed') }
        f.file.close = async () => { throw closeError }
        await assert.rejects(writeSFTPUpload(f.target, f.source), /write failed/)
        assert.deepEqual(f.events, ['stat', 'open', 'chmod:755'])
        assert.equal(f.warnings.length, 1)
        assert.match(f.warnings[0][0], /close/)
        assert.equal(f.warnings[0][1], closeError)
    })

    it('reports a close error after a complete write', async () => {
        const f = fixture(0o755)
        f.file.close = async () => { throw new Error('close failed') }
        await assert.rejects(writeSFTPUpload(f.target, f.source), /close failed/)
        assert.deepEqual(f.events, ['stat', 'open', 'chmod:755', 'write'])
        assert.deepEqual(f.warnings, [])
    })
})
