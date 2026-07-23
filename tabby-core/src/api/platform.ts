import { MenuItemOptions } from './menu'
import { Subject, Observable } from 'rxjs'

/* eslint-disable @typescript-eslint/no-unused-vars */
export interface ClipboardContent {
    text: string
    html?: string
}

export interface MessageBoxOptions {
    type: 'warning'|'error'
    message: string
    detail?: string
    buttons: string[]
    defaultId?: number
    cancelId?: number
}

export interface MessageBoxResult {
    response: number
}

export abstract class FileTransfer {
    abstract getName (): string
    abstract getSize (): number
    abstract close (): void

    getSpeed (): number {
        return this.lastChunkSpeed
    }

    getCompletedBytes (): number {
        return this.completedBytes
    }

    getStatus (): string {
        return this.status
    }

    getTotalSize (): number {
        return this.totalSize
    }

    isComplete (): boolean {
        return this.completed || this.completedBytes >= this.getSize()
    }

    isCancelled (): boolean {
        return this.cancelled
    }

    isFailed (): boolean {
        return this.error !== null
    }

    getError (): string|null {
        return this.error
    }

    markFailed (message: string): void {
        this.error = message
        this.close()
    }

    /** Registers a callback that restarts this transfer from scratch,
     * resolving true once a replacement transfer exists */
    setRetryHandler (fn: () => Promise<boolean>): void {
        this.retryHandler = fn
    }

    canRetry (): boolean {
        return !!this.retryHandler && (this.isFailed() || this.isCancelled())
    }

    async retry (): Promise<boolean> {
        try {
            return await this.retryHandler?.() ?? false
        } catch {
            return false
        }
    }

    cancel (): void {
        this.cancelled = true
        this.close()
    }

    setStatus (status: string): void {
        this.status = status
    }

    setTotalSize (size: number): void {
        this.totalSize = size
    }

    setCompleted (completed: boolean): void {
        this.completed = completed
        if (completed) {
            // a done transfer can't be retried; don't pin the handler's closure
            // (it captures the panel and session) for the lifetime of the list
            this.retryHandler = null
        }
    }

    protected increaseProgress (bytes: number): void {
        if (!bytes) {
            return
        }
        this.completedBytes += bytes
        // concurrent children can report within the same millisecond — never
        // divide by zero
        const elapsed = Math.max(1, Date.now() - this.lastChunkStartTime)
        this.lastChunkSpeed = bytes * 1000 / elapsed
        this.lastChunkStartTime = Date.now()
    }

    private completedBytes = 0
    private totalSize = 0
    private lastChunkStartTime = Date.now()
    private lastChunkSpeed = 0
    private cancelled = false
    protected completed = false
    private status = ''
    private error: string|null = null
    private retryHandler: (() => Promise<boolean>)|null = null
}

export abstract class FileDownload extends FileTransfer {
    abstract write (buffer: Uint8Array): Promise<void>
}

export abstract class DirectoryDownload extends FileTransfer {
    abstract createDirectory (relativePath: string): Promise<void>
    abstract createFile (relativePath: string, mode: number, size: number): Promise<FileDownload>

    // the byte heuristic lies while the total size is still being calculated
    isComplete (): boolean {
        return this.completed
    }

    /** True once the recursive size scan finished and getSize() is meaningful */
    isSizeCalculated (): boolean {
        return this.sizeCalculated
    }

    setSizeCalculated (): void {
        this.sizeCalculated = true
    }

    private sizeCalculated = false

    /** Currently transferring files, for progress display */
    getChildren (): FileTransfer[] {
        return []
    }
}

export abstract class FileUpload extends FileTransfer {
    abstract getMode (): number

    abstract read (): Promise<Uint8Array>

    async readAll (): Promise<Uint8Array> {
        const result = new Uint8Array(this.getSize())
        let pos = 0
        while (true) {
            const buf = await this.read()
            if (!buf.length) {
                break
            }
            result.set(buf, pos)
            pos += buf.length
        }
        return result
    }
}

export interface FileUploadOptions {
    multiple: boolean
}

export class DirectoryUpload {
    private childrens: (FileUpload|DirectoryUpload)[] = []

    constructor (private name = '') {
        // Just set name for now.
    }

    getName (): string {
        return this.name
    }

    getChildrens (): (FileUpload|DirectoryUpload)[] {
        return this.childrens
    }

    pushChildren (item: FileUpload|DirectoryUpload): void {
        this.childrens.push(item)
    }
}

export type PlatformTheme = 'light'|'dark'

export abstract class PlatformService {
    supportsWindowControls = false

    get fileTransferStarted$ (): Observable<FileTransfer> { return this.fileTransferStarted }
    get displayMetricsChanged$ (): Observable<void> { return this.displayMetricsChanged }
    get themeChanged$ (): Observable<PlatformTheme> { return this.themeChanged }

    protected fileTransferStarted = new Subject<FileTransfer>()
    protected displayMetricsChanged = new Subject<void>()
    protected themeChanged = new Subject<PlatformTheme>()

    abstract readClipboard (): string
    abstract setClipboard (content: ClipboardContent): void
    abstract loadConfig (): Promise<string>
    abstract saveConfig (content: string): Promise<void>

    abstract startDownload (name: string, mode: number, size: number): Promise<FileDownload|null>
    abstract startDownloadDirectory (name: string, estimatedSize?: number): Promise<DirectoryDownload|null>
    abstract startUpload (options?: FileUploadOptions): Promise<FileUpload[]>
    abstract startUploadDirectory (paths?: string[]): Promise<DirectoryUpload>

    async startUploadFromDragEvent (event: DragEvent, multiple = false): Promise<DirectoryUpload> {
        const result = new DirectoryUpload()

        if (!event.dataTransfer) {
            return Promise.resolve(result)
        }

        const traverseFileTree = (item: any, root: DirectoryUpload = result): Promise<void> => {
            return new Promise((resolve) => {
                if (item.isFile) {
                    item.file((file: File) => {
                        const transfer = new HTMLFileUpload(file)
                        this.fileTransferStarted.next(transfer)
                        root.pushChildren(transfer)
                        resolve()
                    })
                } else if (item.isDirectory) {
                    const dirReader = item.createReader()
                    const childrenFolder = new DirectoryUpload(item.name)
                    dirReader.readEntries(async (entries: any[]) => {
                        for (const entry of entries) {
                            await traverseFileTree(entry, childrenFolder)
                        }
                        resolve()
                    })
                    root.pushChildren(childrenFolder)
                } else {
                    resolve()
                }
            })
        }

        const promises: Promise<void>[] = []

        const items = event.dataTransfer.items
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry()
            if (item) {
                promises.push(traverseFileTree(item))
                if (!multiple) {
                    break
                }
            }
        }
        return Promise.all(promises).then(() => result)
    }

    getConfigPath (): string|null {
        return null
    }

    showItemInFolder (path: string): void {
        throw new Error('Not implemented')
    }

    async isProcessRunning (name: string): Promise<boolean> {
        return false
    }

    async installPlugin (name: string, version: string): Promise<void> {
        throw new Error('Not implemented')
    }

    async uninstallPlugin (name: string): Promise<void> {
        throw new Error('Not implemented')
    }

    getWinSCPPath (): string|null {
        throw new Error('Not implemented')
    }

    async exec (app: string, argv: string[]): Promise<void> {
        throw new Error('Not implemented')
    }

    isShellIntegrationSupported (): boolean {
        return false
    }

    async isShellIntegrationInstalled (): Promise<boolean> {
        return false
    }

    async installShellIntegration (): Promise<void> {
        throw new Error('Not implemented')
    }

    async uninstallShellIntegration (): Promise<void> {
        throw new Error('Not implemented')
    }

    openPath (path: string): void {
        throw new Error('Not implemented')
    }

    getTheme (): PlatformTheme {
        return 'dark'
    }

    abstract getOSRelease (): string
    abstract getAppVersion (): string
    abstract openExternal (url: string): Promise<void>
    abstract listFonts (): Promise<string[]>
    abstract setErrorHandler (handler: (_: any) => void): void
    abstract popupContextMenu (menu: MenuItemOptions[], event?: MouseEvent): void
    abstract showMessageBox (options: MessageBoxOptions): Promise<MessageBoxResult>
    abstract pickDirectory (): Promise<string | null>
    abstract quit (): void
}

export class HTMLFileUpload extends FileUpload {
    private stream: ReadableStream
    private reader: ReadableStreamDefaultReader

    constructor (private file: File) {
        super()
        this.stream = this.file.stream()
        this.reader = this.stream.getReader()
    }

    getName (): string {
        return this.file.name
    }

    getMode (): number {
        return 0o644
    }

    getSize (): number {
        return this.file.size
    }

    async read (): Promise<Uint8Array> {
        const result: any = await this.reader.read()
        if (result.done || !result.value) {
            return new Uint8Array(0)
        }
        const chunk = new Uint8Array(result.value)
        this.increaseProgress(chunk.length)
        return chunk
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    bringToFront (): void { }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    close (): void { }
}
