interface UploadFile {
    write: (chunk: Uint8Array) => Promise<void>
    close: () => Promise<void>
}

interface UploadTarget {
    stat: () => Promise<{ permissions?: number|null }>
    open: () => Promise<UploadFile>
    chmod: (mode: number) => Promise<void>
}

/** Write the temporary upload with the destination's existing rwx permissions. */
export async function writeSFTPUpload (
    target: UploadTarget,
    source: { read: () => Promise<Uint8Array> },
): Promise<void> {
    let permissions: number|null|undefined = undefined
    try {
        permissions = (await target.stat()).permissions
    } catch (error) {
        // russh exposes the SFTP status as a Rust debug string. Only the
        // missing-file status permits creating a new destination; a failed
        // permissions lookup must not silently become an overwrite.
        const message = error instanceof Error ? error.message : String(error)
        if (/\bstatus_code:\s*(\w+)/.exec(message)?.[1] !== 'NoSuchFile') {
            throw error
        }
    }

    const file = await target.open()
    try {
        if (permissions != null) {
            // Set restrictive modes before writing any data to the temp file.
            await target.chmod(permissions & 0o777)
        }
        while (true) {
            const chunk = await source.read()
            if (!chunk.length) {
                break
            }
            await file.write(chunk)
        }
    } finally {
        await file.close()
    }
}
