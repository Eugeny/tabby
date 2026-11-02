interface UploadFile {
    write: (chunk: Uint8Array) => Promise<void>
    close: () => Promise<void>
}

interface UploadTarget {
    stat: () => Promise<{ permissions?: number|null }>
    open: () => Promise<UploadFile>
    chmod: (mode: number) => Promise<void>
    /** Reports a problem the upload recovers from. */
    warn?: (message: string, error: unknown) => void
}

/** russh exposes the SFTP status as a Rust debug string. */
function isMissingFileError (error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return /\bstatus_code:\s*(\w+)/.exec(message)?.[1] === 'NoSuchFile'
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
        // A missing destination is the normal new-file case. Some servers
        // answer Failure or PermissionDenied for a missing path instead, so
        // any other lookup failure keeps the server's default mode, as
        // before, rather than refusing the upload.
        if (!isMissingFileError(error)) {
            target.warn?.('Could not read the destination permissions, using the server default mode', error)
        }
    }

    const file = await target.open()
    try {
        if (permissions != null) {
            // Set restrictive modes before writing any data to the temp file.
            // Failing here would widen the permissions of an existing file.
            await target.chmod(permissions & 0o777)
        }
        while (true) {
            const chunk = await source.read()
            if (!chunk.length) {
                break
            }
            await file.write(chunk)
        }
    } catch (error) {
        // The error that stopped the upload must not be replaced by a close error.
        await file.close().catch(closeError => {
            target.warn?.('Could not close the temporary upload file', closeError)
        })
        throw error
    }
    await file.close()
}
