import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SFTP } from 'russh/lib/sftp.js'

test('russh stat reads permissions exposed through native metadata getters', async () => {
    // NAPI attributes are prototype accessors, not enumerable own properties.
    const metadata = Object.create({
        get size () { return '123' },
        get permissions () { return 0o100600 },
        type () { return 1 },
    })
    assert.equal(Object.hasOwn(metadata, 'permissions'), false)
    const stream = { subscribe: () => ({ unsubscribe () {} }) }
    const events = {
        close$: { subscribe: () => ({}) },
        data$: { subscribe: () => stream },
        extendedData$: { subscribe: () => stream },
    }
    const paths = []
    const sftp = new SFTP({
        channelId: 1,
        stat: async path => { paths.push(path); return metadata },
    }, events)
    const result = await sftp.stat('/private-file')
    assert.deepEqual(paths, ['/private-file'])
    assert.equal(result.permissions, 0o100600)
    assert.equal(result.size, 123)
    assert.equal(result.type, 1)
})
