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
    abstract getMode (): number
    abstract getSize (): number
    abstract close (): void

    getSpeed (): number {
        return this.lastChunkSpeed
    }

    getCompletedBytes (): number {
        return this.completedBytes
    }

    isComplete (): boolean {
        return this.completedBytes >= this.getSize()
    }

    isCancelled (): boolean {
        return this.cancelled
    }

    cancel (): void {
        this.cancelled = true
        this.close()
    }

    protected increaseProgress (bytes: number): void {
        if (!bytes) {
            return
        }
        this.completedBytes += bytes
        this.lastChunkSpeed = bytes * 1000 / (Date.now() - this.lastChunkStartTime)
        this.lastChunkStartTime = Date.now()
    }

    private completedBytes = 0
    private lastChunkStartTime = Date.now()
    private lastChunkSpeed = 0
    private cancelled = false
}

export abstract class FileDownload extends FileTransfer {
    abstract write (buffer: Buffer): Promise<void>
}

export abstract class FileUpload extends FileTransfer {
    abstract read (): Promise<Buffer>

    async readAll (): Promise<Buffer> {
        const buffers: Buffer[] = []
        while (true) {
            const buf = await this.read()
            if (!buf.length) {
                break
            }
            buffers.push(Buffer.from(buf))
        }
        return Buffer.concat(buffers)
    }
}

export interface FileUploadOptions {
    multiple: boolean
}

export abstract class PlatformService {
    supportsWindowControls = false

    get fileTransferStarted$ (): Observable<FileTransfer> { return this.fileTransferStarted }
    get displayMetricsChanged$ (): Observable<void> { return this.displayMetricsChanged }

    protected fileTransferStarted = new Subject<FileTransfer>()
    protected displayMetricsChanged = new Subject<void>()

    abstract readClipboard (): string
    abstract setClipboard (content: ClipboardContent): void
    abstract loadConfig (): Promise<string>
    abstract saveConfig (content: string): Promise<void>

    abstract startDownload (name: string, mode: number, size: number): Promise<FileDownload|null>
    abstract startUpload (options?: FileUploadOptions): Promise<FileUpload[]>

    startUploadFromDragEvent (event: DragEvent, multiple = false): FileUpload[] {
        const result: FileUpload[] = []
        if (!event.dataTransfer) {
            return []
        }
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < event.dataTransfer.files.length; i++) {
            const file = event.dataTransfer.files[i]
            const transfer = new HTMLFileUpload(file)
            this.fileTransferStarted.next(transfer)
            result.push(transfer)
            if (!multiple) {
                break
            }
        }
        return result
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

    exec (app: string, argv: string[]): void {
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

    abstract getOSRelease (): string
    abstract getAppVersion (): string
    abstract openExternal (url: string): void
    abstract listFonts (): Promise<string[]>
    abstract setErrorHandler (handler: (_: any) => void): void
    abstract popupContextMenu (menu: MenuItemOptions[], event?: MouseEvent): void
    abstract showMessageBox (options: MessageBoxOptions): Promise<MessageBoxResult>
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

    async read (): Promise<Buffer> {
        const result: any = await this.reader.read()
        if (result.done || !result.value) {
            return Buffer.from('')
        }
        const chunk = Buffer.from(result.value)
        this.increaseProgress(chunk.length)
        return chunk
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    bringToFront (): void { }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    close (): void { }
}
