import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DirectoryUpload, FileTransfer, FileUpload, PlatformService } from '../../tabby-core/src/api/platform.ts'

function fileEntry (name: string) {
    return {
        isFile: true,
        file (callback: (file: File) => void) {
            queueMicrotask(() => callback(new File([name], name)))
        },
    }
}

function files (count: number) {
    return Array.from({ length: count }, (_, i) => fileEntry(`file-${i}.txt`))
}

function directoryEntry (name: string, entries: any[], batchSize = 100) {
    return {
        name,
        isDirectory: true,
        readerCount: 0,
        readCount: 0,
        createReader () {
            this.readerCount++
            let offset = 0
            return {
                readEntries: (callback: (batch: any[]) => void) => {
                    this.readCount++
                    const batch = entries.slice(offset, offset + batchSize)
                    offset += batch.length
                    queueMicrotask(() => callback(batch))
                },
            }
        },
    }
}

async function drop (entries: any[], multiple?: boolean) {
    // Only the concrete drag-and-drop method is used, not the platform-specific abstract methods.
    const platform: PlatformService = new (PlatformService as any)()
    const transfers: FileTransfer[] = []
    platform.fileTransferStarted$.subscribe(transfer => transfers.push(transfer))
    const event = {
        dataTransfer: { items: entries.map(entry => ({ webkitGetAsEntry: () => entry })) },
    } as unknown as DragEvent
    const result = await platform.startUploadFromDragEvent(event, multiple)
    return { result, transfers }
}

function children (parent: DirectoryUpload, index = 0): (FileUpload|DirectoryUpload)[] {
    const directory = parent.getChildrens()[index]
    assert.ok(directory instanceof DirectoryUpload)
    return directory.getChildrens()
}

describe('PlatformService.startUploadFromDragEvent()', () => {
    it('reads every batch of a dropped directory using the same reader', async () => {
        const directory = directoryEntry('dist', files(237))
        const { result, transfers } = await drop([directory])
        const uploads = children(result)

        assert.equal(uploads.length, 237)
        assert.deepEqual(uploads.map(upload => upload.getName()), Array.from({ length: 237 }, (_, i) => `file-${i}.txt`))
        assert.deepEqual(transfers, uploads)
        assert.equal(directory.readerCount, 1)
        assert.equal(directory.readCount, 4) // 100, 100, 37, then the terminal empty batch
        assert.equal(result.getChildrens()[0].getName(), 'dist')
        assert.equal(Buffer.from(await (uploads[236] as FileUpload).readAll()).toString(), 'file-236.txt')
    })

    for (const count of [0, 3, 100]) {
        it(`reads a directory containing ${count} files until an empty batch`, async () => {
            const directory = directoryEntry('dist', files(count))
            const { result, transfers } = await drop([directory])

            assert.equal(children(result).length, count)
            assert.deepEqual(transfers, children(result))
            assert.equal(directory.readerCount, 1)
            assert.equal(directory.readCount, count ? 2 : 1)
        })
    }

    it('preserves nested directories and reads their later batches before completing', async () => {
        const nested = directoryEntry('assets', files(101))
        const empty = directoryEntry('empty', [])
        const directory = directoryEntry('dist', [fileEntry('index.html'), nested, empty], 1)
        const { result, transfers } = await drop([directory])
        const uploads = children(result)

        assert.deepEqual(uploads.map(upload => upload.getName()), ['index.html', 'assets', 'empty'])
        const subdirectories = result.getChildrens()[0] as DirectoryUpload
        assert.equal(children(subdirectories, 1).length, 101)
        assert.equal(children(subdirectories, 2).length, 0)
        assert.deepEqual(transfers, [uploads[0], ...children(subdirectories, 1)])
        assert.equal(directory.readCount, 4)
        assert.equal(nested.readCount, 3)
        assert.equal(empty.readCount, 1)
    })

    it('includes all dropped roots when multiple is enabled', async () => {
        const { result, transfers } = await drop([
            directoryEntry('first', files(101)), directoryEntry('second', files(2)), fileEntry('loose.txt'),
        ], true)

        assert.deepEqual(result.getChildrens().map(upload => upload.getName()), ['first', 'second', 'loose.txt'])
        assert.equal(children(result).length, 101)
        assert.equal(children(result, 1).length, 2)
        assert.equal(transfers.length, 104)
    })

    it('only includes the first valid root by default', async () => {
        const { result, transfers } = await drop([
            null, directoryEntry('first', files(101)), directoryEntry('second', files(2)),
        ])

        assert.deepEqual(result.getChildrens().map(upload => upload.getName()), ['first'])
        assert.equal(children(result).length, 101)
        assert.deepEqual(transfers, children(result))
    })
})
