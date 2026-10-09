import * as fs from 'mz/fs'
import * as fsSync from 'fs'

/**
 * Returns `true` only if `path` exists *and* is a directory.
 *
 * A plain existence check is not enough for anything that will be used as a
 * process' working directory: `CreateProcessW` fails with `ERROR_DIRECTORY`
 * (267) when `lpCurrentDirectory` points at a file.
 */
export async function isDirectory (path: string|null|undefined): Promise<boolean> {
    if (!path) {
        return false
    }
    try {
        return (await fs.stat(path)).isDirectory()
    } catch {
        return false
    }
}

/** Synchronous counterpart of [[isDirectory]]. */
export function isDirectorySync (path: string|null|undefined): boolean {
    if (!path) {
        return false
    }
    try {
        return fsSync.statSync(path).isDirectory()
    } catch {
        return false
    }
}
