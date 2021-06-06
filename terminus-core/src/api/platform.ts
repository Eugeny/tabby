import { MenuItemOptions } from './menu'

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
}

export interface MessageBoxResult {
    response: number
}

export abstract class FileTransfer {
    abstract getName (): string
    abstract getSize (): number
    abstract close (): void

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
        this.completedBytes += bytes
    }

    private completedBytes = 0
    private cancelled = false
}

export abstract class FileDownload extends FileTransfer {
    abstract write (buffer: Buffer): Promise<void>
}

export abstract class FileUpload extends FileTransfer {
    abstract read (): Promise<Buffer>
}

export abstract class PlatformService {
    supportsWindowControls = false

    abstract readClipboard (): string
    abstract setClipboard (content: ClipboardContent): void
    abstract loadConfig (): Promise<string>
    abstract saveConfig (content: string): Promise<void>

    abstract startDownload (name: string, size: number): Promise<FileDownload>
    abstract startUpload (): Promise<FileUpload[]>

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
    abstract popupContextMenu (menu: MenuItemOptions[], event?: MouseEvent): void
    abstract showMessageBox (options: MessageBoxOptions): Promise<MessageBoxResult>
    abstract quit (): void
}
