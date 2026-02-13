import * as fs from 'fs/promises'
import * as path from 'path'
import * as russh from 'russh'
import { FileSystem, FileEntry, FileHandle } from '../api/fileSystem'

class LocalFileHandle implements FileHandle {
    constructor (private handle: fs.FileHandle) { }

    async read (): Promise<Uint8Array> {
        const buffer = Buffer.alloc(256 * 1024)
        const result = await this.handle.read(buffer, 0, buffer.length, null)
        if (result.bytesRead === 0) {
            return new Uint8Array(0)
        }
        return buffer.subarray(0, result.bytesRead)
    }

    async write (chunk: Uint8Array): Promise<void> {
        await this.handle.write(chunk)
    }

    async close (): Promise<void> {
        await this.handle.close()
    }
}

export class LocalFileSystem extends FileSystem {
    get pathSeparator (): string {
        return path.sep
    }

    join (...paths: string[]): string {
        return path.join(...paths)
    }

    dirname (p: string): string {
        return path.dirname(p)
    }

    basename (p: string): string {
        return path.basename(p)
    }

    resolve (p: string): string {
        return path.resolve(p)
    }

    async readdir (p: string): Promise<FileEntry[]> {
        const names = await fs.readdir(p)
        const entries: FileEntry[] = []
        for (const name of names) {
            try {
                const fullPath = path.join(p, name)
                const stats = await fs.lstat(fullPath)
                entries.push({
                    name,
                    fullPath,
                    isDirectory: stats.isDirectory(),
                    isSymlink: stats.isSymbolicLink(),
                    mode: stats.mode,
                    size: stats.size,
                    modified: stats.mtime,
                })
            } catch (e) {
                console.warn(`Could not stat ${name}`, e)
            }
        }
        return entries
    }

    async stat (p: string): Promise<FileEntry> {
        const stats = await fs.stat(p)
        return {
            name: path.basename(p),
            fullPath: p,
            isDirectory: stats.isDirectory(),
            isSymlink: stats.isSymbolicLink(),
            mode: stats.mode,
            size: stats.size,
            modified: stats.mtime,
        }
    }
    
    async open (p: string, mode: number): Promise<FileHandle> {
        let flags = 'r'
        if ((mode & russh.OPEN_WRITE) && (mode & russh.OPEN_CREATE)) {
            flags = 'w+'
        } else if (mode & russh.OPEN_WRITE) {
            flags = 'w'
        } else if (mode & russh.OPEN_APPEND) {
            flags = 'a'
        }
        const handle = await fs.open(p, flags)
        return new LocalFileHandle(handle)
    }

    async mkdir (p: string): Promise<void> {
        await fs.mkdir(p)
    }

    async rmdir (p: string): Promise<void> {
        await fs.rmdir(p)
    }

    async unlink (p: string): Promise<void> {
        await fs.unlink(p)
    }

    async rename (oldPath: string, newPath: string): Promise<void> {
        await fs.rename(oldPath, newPath)
    }

    async chmod (p: string, mode: string|number): Promise<void> {
        await fs.chmod(p, mode)
    }
}
