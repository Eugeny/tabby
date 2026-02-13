
export interface FileEntry {
    name: string
    fullPath: string
    isDirectory: boolean
    isSymlink: boolean
    mode: number
    size: number
    modified: Date
}

export interface FileHandle {
    read (): Promise<Uint8Array>
    write (chunk: Uint8Array): Promise<void>
    close (): Promise<void>
}

export abstract class FileSystem {
    abstract get pathSeparator (): string
    abstract join (...paths: string[]): string
    abstract dirname (p: string): string
    abstract basename (p: string): string
    abstract resolve (p: string): string

    abstract readdir (p: string): Promise<FileEntry[]>
    abstract stat (p: string): Promise<FileEntry>
    abstract open (p: string, mode: number): Promise<FileHandle>
    abstract mkdir (p: string): Promise<void>
    abstract rmdir (p: string): Promise<void>
    abstract unlink (p: string): Promise<void>
    abstract rename (oldPath: string, newPath: string): Promise<void>
    abstract chmod (p: string, mode: string|number): Promise<void>
}
