import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { writeSFTPUpload } from '../src/session/sftpUpload.ts'

function fixture (permissions: number|null|undefined|Error) {
    const events: string[] = []
    const source = [new Uint8Array([1, 2, 3]), new Uint8Array()]
    const target = {
        stat: async () => {
            events.push('stat')
            if (permissions instanceof Error) { throw permissions }
            return { permissions }
        },
        open: async () => {
            events.push('open')
            return {
                write: async (_chunk: Uint8Array) => { events.push('write') },
                close: async () => { events.push('close') },
            }
        },
        chmod: async (mode: number) => { events.push(`chmod:${mode.toString(8)}`) },
    }
    return { target, source: { read: async () => source.shift()! }, events }
}

describe('SFTP upload permissions', () => {
    for (const mode of [0o755, 0o600, 0o644, 0]) {
        it(`preserves mode ${mode.toString(8)} before writing`, async () => {
            const f = fixture(0o100000 | mode)
            await writeSFTPUpload(f.target, f.source)
            assert.deepEqual(f.events, ['stat', 'open', `chmod:${mode.toString(8)}`, 'write', 'close'])
        })
    }

    it('keeps server defaults when the destination does not exist', async () => {
        const f = fixture(new Error('Status(Status { id: 1, status_code: NoSuchFile, error_message: "No such file" })'))
        await writeSFTPUpload(f.target, f.source)
        assert.deepEqual(f.events, ['stat', 'open', 'write', 'close'])
    })

    it('does not invent permissions when the server omits them', async () => {
        const f = fixture(undefined)
        await writeSFTPUpload(f.target, f.source)
        assert.deepEqual(f.events, ['stat', 'open', 'write', 'close'])
    })

    it('stops before opening when stat fails for another reason', async () => {
        const error = new Error('Status(Status { status_code: PermissionDenied, error_message: "NoSuchFile" })')
        const f = fixture(error)
        await assert.rejects(writeSFTPUpload(f.target, f.source), error)
        assert.deepEqual(f.events, ['stat'])
    })

    it('closes without writing when chmod fails', async () => {
        const f = fixture(0o600)
        f.target.chmod = async () => { throw new Error('chmod denied') }
        await assert.rejects(writeSFTPUpload(f.target, f.source), /chmod denied/)
        assert.deepEqual(f.events, ['stat', 'open', 'close'])
    })

    it('closes the handle when reading or writing fails', async () => {
        const f = fixture(0o755)
        f.source.read = async () => { throw new Error('local read failed') }
        await assert.rejects(writeSFTPUpload(f.target, f.source), /local read failed/)
        assert.equal(f.events.at(-1), 'close')
    })
})
