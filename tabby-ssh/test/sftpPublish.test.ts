import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { posix as posixPath } from 'node:path'
import { publishUpload } from '../src/session/sftpPublish.ts'

const TEMP = '/dir/.tabby-upload-1'
const BACKUP = '/dir/.tabby-backup-1'
const DEST = '/dir/file'

/** A server that, like OpenSSH, refuses to rename over an existing file */
function fakeServer (files: Record<string, string>, directories: string[] = []) {
    const renames: string[] = []
    const server = {
        files: new Map(Object.entries(files)),
        renames,
        /** Called before each rename with its 1-based number; may throw, or return 'lose-reply' */
        onRename: (_n: number): 'lose-reply'|undefined => undefined,
        async rename (from: string, to: string): Promise<void> {
            renames.push(`${from} -> ${to}`)
            const outcome = server.onRename(renames.length)
            if (!server.files.has(from)) {
                throw new Error('NoSuchFile')
            }
            if (server.files.has(to) || directories.includes(to)) {
                throw new Error('Failure')
            }
            server.files.set(to, server.files.get(from)!)
            server.files.delete(from)
            if (outcome === 'lose-reply') {
                throw new Error('Timeout')
            }
        },
        async stat (path: string): Promise<{ isDirectory: boolean }> {
            if (directories.includes(path)) {
                return { isDirectory: true }
            }
            if (!server.files.has(path)) {
                throw new Error('NoSuchFile')
            }
            return { isDirectory: false }
        },
        async readdir (path: string): Promise<{ name: string }[]> {
            return [...server.files.keys(), ...directories]
                .filter(x => posixPath.dirname(x) === path)
                .map(x => ({ name: posixPath.basename(x) }))
        },
        async unlink (path: string): Promise<void> {
            server.files.delete(path)
        },
    }
    return server
}

describe('publishUpload', () => {
    it('renames straight into place when nothing is in the way', async () => {
        const server = fakeServer({ [TEMP]: 'new' })
        await publishUpload(server, TEMP, DEST, BACKUP)
        assert.deepEqual([...server.files], [[DEST, 'new']])
    })

    it('replaces an existing file and removes the backup', async () => {
        const server = fakeServer({ [DEST]: 'old', [TEMP]: 'new' })
        await publishUpload(server, TEMP, DEST, BACKUP)
        assert.deepEqual([...server.files], [[DEST, 'new']])
    })

    it('restores the original when the replacement cannot be moved into place', async () => {
        const server = fakeServer({ [DEST]: 'old', [TEMP]: 'new' })
        server.onRename = n => {
            if (n === 3) {
                throw new Error('PermissionDenied')
            }
            return undefined
        }
        await assert.rejects(publishUpload(server, TEMP, DEST, BACKUP), /original was restored.*\.tabby-upload-1/)
        assert.equal(server.files.get(DEST), 'old')
        assert.equal(server.files.get(TEMP), 'new')
        assert.equal(server.files.has(BACKUP), false)
    })

    it('keeps both the original and the upload when restoring fails too', async () => {
        const server = fakeServer({ [DEST]: 'old', [TEMP]: 'new' })
        server.onRename = n => {
            if (n >= 3) {
                throw new Error('PermissionDenied')
            }
            return undefined
        }
        await assert.rejects(publishUpload(server, TEMP, DEST, BACKUP), /replace or restore.*\.tabby-backup-1.*\.tabby-upload-1/)
        assert.equal(server.files.get(BACKUP), 'old')
        assert.equal(server.files.get(TEMP), 'new')
    })

    it('does nothing more when the first rename went through but its reply was lost', async () => {
        const server = fakeServer({ [TEMP]: 'new' })
        server.onRename = () => 'lose-reply'
        await assert.rejects(publishUpload(server, TEMP, DEST, BACKUP), /Could not publish/)
        assert.equal(server.renames.length, 1)
        assert.deepEqual([...server.files], [[DEST, 'new']])
    })

    it('keeps the backup when the replacing rename went through but its reply was lost', async () => {
        const server = fakeServer({ [DEST]: 'old', [TEMP]: 'new' })
        server.onRename = n => n === 3 ? 'lose-reply' : undefined
        await assert.rejects(publishUpload(server, TEMP, DEST, BACKUP), /Could not confirm replacement/)
        assert.equal(server.files.get(DEST), 'new')
        assert.equal(server.files.get(BACKUP), 'old')
    })

    it('leaves a directory at the destination alone', async () => {
        const server = fakeServer({ [TEMP]: 'new' }, [DEST])
        await assert.rejects(publishUpload(server, TEMP, DEST, BACKUP), /Could not publish/)
        assert.equal(server.renames.length, 1)
        assert.equal(server.files.get(TEMP), 'new')
    })

    it('does not touch the original when the connection is too broken to check', async () => {
        const server = fakeServer({ [DEST]: 'old', [TEMP]: 'new' })
        server.stat = async () => {
            throw new Error('Timeout')
        }
        await assert.rejects(publishUpload(server, TEMP, DEST, BACKUP), /Could not publish/)
        assert.equal(server.renames.length, 1)
        assert.equal(server.files.get(DEST), 'old')
    })
})
