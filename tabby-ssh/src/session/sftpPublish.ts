import { posix as posixPath } from 'path'

/** The SFTP operations publishing needs - kept minimal so that it can be tested without a server */
export interface PublishTarget {
    rename: (oldPath: string, newPath: string) => Promise<void>
    stat: (path: string) => Promise<{ isDirectory: boolean }>
    readdir: (path: string) => Promise<{ name: string }[]>
    unlink: (path: string) => Promise<void>
}

/**
 * Moves a finished upload from `tempPath` to `path` without ever deleting the
 * file already at `path` before its replacement is in place.
 * On failure, the error says where the original and the upload ended up.
 */
export async function publishUpload (
    fs: PublishTarget,
    tempPath: string,
    path: string,
    backupPath: string,
    warn: (...args: unknown[]) => void = () => null,
): Promise<void> {
    try {
        await fs.rename(tempPath, path)
        return
    } catch (e) {
        // Most servers (OpenSSH included) refuse to rename over an existing file.
        // Only go on if that is clearly what happened: the destination is a file and the
        // upload is still where it was. Anything else - a lost reply after a rename that
        // did go through, a directory in the way, a dead connection - stops here.
        const [existing, temp] = await Promise.all([
            fs.stat(path).catch(() => null),
            fs.stat(tempPath).catch(() => null),
        ])
        if (!existing || existing.isDirectory || !temp) {
            throw new Error(`Could not publish upload to ${path}. Check ${tempPath} for the uploaded file. ${e}`)
        }
    }

    try {
        await fs.rename(path, backupPath)
    } catch (e) {
        throw new Error(`Could not move ${path} aside, so it was not replaced. Check ${tempPath} for the upload (and ${backupPath} if ${path} is gone). ${e}`)
    }
    try {
        await fs.rename(tempPath, path)
    } catch (e) {
        // A second client may have created the destination, or the rename may have
        // succeeded before its reply was lost. Only restore the original when the
        // destination is known to be free; otherwise leave both recovery paths untouched.
        const entries = await fs.readdir(posixPath.dirname(path)).catch(() => null)
        if (entries && !entries.some(entry => entry.name === posixPath.basename(path))) {
            try {
                await fs.rename(backupPath, path)
            } catch (restoreError) {
                throw new Error(`Could not replace or restore ${path}. Check ${backupPath} for the original and ${tempPath} for the upload. ${e}; ${restoreError}`)
            }
            throw new Error(`Could not replace ${path}. The original was restored. Check ${tempPath} for the upload. ${e}`)
        }
        throw new Error(`Could not confirm replacement of ${path}. Check ${backupPath} for the original and ${tempPath} for the upload. ${e}`)
    }
    await fs.unlink(backupPath).catch(e => warn('Could not remove upload backup', backupPath, e))
}
