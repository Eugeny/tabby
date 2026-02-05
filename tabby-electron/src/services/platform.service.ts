import * as path from 'path'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as os from 'os'
import promiseIpc, { RendererProcessType } from 'electron-promise-ipc'
import { execFile } from 'mz/child_process'
import { Injectable, NgZone } from '@angular/core'
import { PlatformService, ClipboardContent, Platform, MenuItemOptions, MessageBoxOptions, MessageBoxResult, DirectoryUpload, FileUpload, FileDownload, DirectoryDownload, FileUploadOptions, wrapPromise, TranslateService, FileTransfer, PlatformTheme } from 'tabby-core'
import { ElectronService } from '../services/electron.service'
import { ElectronHostWindow } from './hostWindow.service'
import { ShellIntegrationService } from './shellIntegration.service'
import { ElectronHostAppService } from './hostApp.service'
import { configPath } from '../../../app/lib/config'
const fontManager = require('fontmanager-redux') // eslint-disable-line

/* eslint-disable block-scoped-var */

try {
    // eslint-disable-next-line no-var
    var windowsProcessTreeNative = require('@tabby-gang/windows-process-tree/build/Release/windows_process_tree.node')
    // eslint-disable-next-line no-var
    var wnr = require('windows-native-registry')
} catch { }

@Injectable({ providedIn: 'root' })
export class ElectronPlatformService extends PlatformService {
    supportsWindowControls = true
    private configPath: string

    constructor (
        private hostApp: ElectronHostAppService,
        private hostWindow: ElectronHostWindow,
        private electron: ElectronService,
        private zone: NgZone,
        private shellIntegration: ShellIntegrationService,
        private translate: TranslateService,
    ) {
        super()
        this.configPath = configPath

        electron.ipcRenderer.on('host:display-metrics-changed', () => {
            this.zone.run(() => this.displayMetricsChanged.next())
        })

        electron.nativeTheme.on('updated', () => {
            this.zone.run(() => this.themeChanged.next(this.getTheme()))
        })
    }

    async getAllFiles (dir: string, root: DirectoryUpload): Promise<DirectoryUpload> {
        const items = await fs.readdir(dir, { withFileTypes: true })
        for (const item of items) {
            if (item.isDirectory()) {
                root.pushChildren(await this.getAllFiles(path.join(dir, item.name), new DirectoryUpload(item.name)))
            } else {
                const file = new ElectronFileUpload(path.join(dir, item.name), this.electron)
                root.pushChildren(file)
                await wrapPromise(this.zone, file.open())
                this.fileTransferStarted.next(file)
            }
        }
        return root
    }

    readClipboard (): string {
        return this.electron.clipboard.readText()
    }

    setClipboard (content: ClipboardContent): void {
        require('@electron/remote').clipboard.write(content)
    }

    async installPlugin (name: string, version: string): Promise<void> {
        await (promiseIpc as RendererProcessType).send('plugin-manager:install', name, version)
    }

    async uninstallPlugin (name: string): Promise<void> {
        await (promiseIpc as RendererProcessType).send('plugin-manager:uninstall', name)
    }

    async isProcessRunning (name: string): Promise<boolean> {
        if (this.hostApp.platform === Platform.Windows) {
            return new Promise<boolean>(resolve => {
                windowsProcessTreeNative.getProcessList(list => { // eslint-disable-line block-scoped-var
                    resolve(list.some(x => x.name === name))
                }, 0)
            })
        } else {
            throw new Error('Not supported')
        }
    }

    getWinSCPPath (): string|null {
        const key = wnr.getRegistryKey(wnr.HK.CR, 'WinSCP.Url\\DefaultIcon')
        if (key?.['']) {
            let detectedPath = key[''].value?.split(',')[0]
            detectedPath = detectedPath?.substring(1, detectedPath.length - 1)
            return detectedPath
        }
        return null
    }

    async exec (app: string, argv: string[]): Promise<void> {
        await execFile(app, argv)
    }

    isShellIntegrationSupported (): boolean {
        return this.hostApp.platform !== Platform.Linux
    }

    async isShellIntegrationInstalled (): Promise<boolean> {
        return this.shellIntegration.isInstalled()
    }

    async installShellIntegration (): Promise<void> {
        await this.shellIntegration.install()
    }

    async uninstallShellIntegration (): Promise<void> {
        await this.shellIntegration.remove()
    }

    async loadConfig (): Promise<string> {
        if (fsSync.existsSync(this.configPath)) {
            return fs.readFile(this.configPath, 'utf8')
        } else {
            return ''
        }
    }

    async saveConfig (content: string): Promise<void> {
        await this.hostApp.saveConfig(content)
    }

    getConfigPath (): string|null {
        return this.configPath
    }

    showItemInFolder (p: string): void {
        this.electron.shell.showItemInFolder(p)
    }

    openExternal (url: string): void {
        this.electron.shell.openExternal(url)
    }

    openPath (p: string): void {
        this.electron.shell.openPath(p)
    }

    getOSRelease (): string {
        return os.release()
    }

    getAppVersion (): string {
        return this.electron.app.getVersion()
    }

    async listFonts (): Promise<string[]> {
        if (this.hostApp.platform === Platform.Windows || this.hostApp.platform === Platform.macOS) {
            let fonts = await new Promise<any[]>(resolve => fontManager.getAvailableFonts(resolve))
            fonts = fonts.map(x => x.family.trim())
            return fonts
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (this.hostApp.platform === Platform.Linux) {
            const stdout = (await execFile('fc-list', [':spacing=mono']))[0]
            const fonts = stdout.toString()
                .split('\n')
                .filter(x => !!x)
                .map(x => x.split(':')[1].trim())
                .map(x => x.split(',')[0].trim())
            fonts.sort()
            return fonts
        }
        return []
    }

    popupContextMenu (menu: MenuItemOptions[], _event?: MouseEvent): void {
        this.electron.Menu.buildFromTemplate(menu.map(item => this.rewrapMenuItemOptions(item))).popup({})
    }

    rewrapMenuItemOptions (menu: MenuItemOptions): MenuItemOptions {
        return {
            ...menu,
            click: () => {
                this.zone.run(() => {
                    menu.click?.()
                })
            },
            submenu: menu.submenu ? menu.submenu.map(x => this.rewrapMenuItemOptions(x)) : undefined,
        }
    }

    async showMessageBox (options: MessageBoxOptions): Promise<MessageBoxResult> {
        return this.electron.dialog.showMessageBox(this.hostWindow.getWindow(), options)
    }

    quit (): void {
        this.electron.app.exit(0)
    }

    async startUpload (options?: FileUploadOptions, paths?: string[]): Promise<FileUpload[]> {
        options ??= { multiple: false }

        const properties: any[] = ['openFile', 'treatPackageAsDirectory']
        if (options.multiple) {
            properties.push('multiSelections')
        }

        if (!paths) {
            const result = await this.electron.dialog.showOpenDialog(
                this.hostWindow.getWindow(),
                {
                    buttonLabel: this.translate.instant('Select'),
                    properties,
                },
            )
            if (result.canceled) {
                return []
            }
            paths = result.filePaths
        }

        return Promise.all(paths.map(async p => {
            const transfer = new ElectronFileUpload(p, this.electron)
            await wrapPromise(this.zone, transfer.open())
            this.fileTransferStarted.next(transfer)
            return transfer
        }))
    }

    async startUploadDirectory (paths?: string[]): Promise<DirectoryUpload> {
        const properties: any[] = ['openFile', 'treatPackageAsDirectory', 'openDirectory']

        if (!paths) {
            const result = await this.electron.dialog.showOpenDialog(
                this.hostWindow.getWindow(),
                {
                    buttonLabel: this.translate.instant('Select'),
                    properties,
                },
            )
            if (result.canceled) {
                return new DirectoryUpload()
            }
            paths = result.filePaths
        }

        const root = new DirectoryUpload()
        root.pushChildren(await this.getAllFiles(paths[0].split(path.sep).join(path.posix.sep), new DirectoryUpload(path.basename(paths[0]))))
        return root
    }

    async startDownload (name: string, mode: number, size: number, filePath?: string): Promise<FileDownload|null> {
        if (!filePath) {
            const result = await this.electron.dialog.showSaveDialog(
                this.hostWindow.getWindow(),
                {
                    defaultPath: name,
                },
            )
            if (!result.filePath) {
                return null
            }
            filePath = result.filePath
        }
        const transfer = new ElectronFileDownload(filePath, mode, size, this.electron)
        await wrapPromise(this.zone, transfer.open())
        this.fileTransferStarted.next(transfer)
        return transfer
    }

    async startDownloadDirectory (name: string, estimatedSize?: number): Promise<DirectoryDownload|null> {
        const selectedFolder = await this.pickDirectory(this.translate.instant('Select destination folder for {name}', { name }), this.translate.instant('Download here'))
        if (!selectedFolder) {
            return null
        }

        let downloadPath = path.join(selectedFolder, name)
        let counter = 1
        while (fsSync.existsSync(downloadPath)) {
            downloadPath = path.join(selectedFolder, `${name} (${counter})`)
            counter++
        }

        const transfer = new ElectronDirectoryDownload(downloadPath, name, estimatedSize ?? 0, this.electron, this.zone)
        await wrapPromise(this.zone, transfer.open())
        this.fileTransferStarted.next(transfer)
        return transfer
    }

    _registerFileTransfer (transfer: FileTransfer): void {
        this.fileTransferStarted.next(transfer)
    }

    setErrorHandler (handler: (_: any) => void): void {
        this.electron.ipcRenderer.on('uncaughtException', (_$event, err) => {
            handler(err)
        })
    }

    async pickDirectory (title?: string, buttonLabel?: string): Promise<string | null> {
        const result = await this.electron.dialog.showOpenDialog(
            this.hostWindow.getWindow(),
            {
                title,
                buttonLabel,
                properties: ['openDirectory', 'showHiddenFiles'],
            },
        )
        if (result.canceled || !result.filePaths.length) {
            return null
        }
        return result.filePaths[0]
    }

    getTheme (): PlatformTheme {
        if (this.electron.nativeTheme.shouldUseDarkColors) {
            return 'dark'
        } else {
            return 'light'
        }
    }

    // Touch ID / Biometric methods (macOS only)
    private touchIdCache: {
        encrypted: number[],
        timestamp: number,
        enabled?: boolean,
        expireDays?: number,
        expireOnRestart?: boolean,
        bootTime?: number,
    }|null = null

    private get touchIdStoragePath (): string {
        return path.join(path.dirname(this.configPath), 'vault-touchid.json')
    }

    private getBootTime (): number {
        // Calculate boot time from current time minus uptime
        return Date.now() - os.uptime() * 1000
    }

    private loadTouchIdCache (): void {
        if (!this.touchIdCache) {
            if (fsSync.existsSync(this.touchIdStoragePath)) {
                try {
                    const content = fsSync.readFileSync(this.touchIdStoragePath, 'utf8')
                    this.touchIdCache = JSON.parse(content)
                } catch {
                    this.touchIdCache = null
                }
            }
        }
    }

    private async saveTouchIdCache (): Promise<void> {
        if (this.touchIdCache) {
            await fs.writeFile(this.touchIdStoragePath, JSON.stringify(this.touchIdCache), 'utf8')
            try {
                await fs.chmod(this.touchIdStoragePath, 0o600)
            } catch {
                // Ignore permission-setting errors to avoid breaking functionality on unsupported platforms
            }
        }
    }

    async isBiometricAuthAvailable (): Promise<boolean> {
        if (this.hostApp.platform !== Platform.macOS) {
            return false
        }
        try {
            return this.electron.systemPreferences.canPromptTouchID()
        } catch {
            return false
        }
    }

    async promptBiometricAuth (reason: string): Promise<void> {
        if (this.hostApp.platform !== Platform.macOS) {
            throw new Error('Biometric authentication is only available on macOS')
        }
        return this.electron.systemPreferences.promptTouchID(reason)
    }

    async isSecureStorageAvailable (): Promise<boolean> {
        // safeStorage is available via main process IPC
        if (this.hostApp.platform !== Platform.macOS) {
            return false
        }
        return this.electron.ipcRenderer.invoke('app:safe-storage-available')
    }

    async secureStorePassphrase (passphrase: string): Promise<void> {
        const encrypted: Buffer = await this.electron.ipcRenderer.invoke('app:safe-storage-encrypt', passphrase)
        this.loadTouchIdCache()
        if (!this.touchIdCache) {
            this.touchIdCache = { encrypted: [], timestamp: 0 }
        }
        this.touchIdCache.encrypted = Array.from(encrypted)
        this.touchIdCache.timestamp = Date.now()
        this.touchIdCache.bootTime = this.getBootTime()
        await this.saveTouchIdCache()
    }

    async secureRetrievePassphrase (): Promise<string|null> {
        try {
            this.loadTouchIdCache()
            if (!this.touchIdCache?.encrypted.length) {
                return null
            }
            const encrypted = Buffer.from(this.touchIdCache.encrypted)
            const decrypted: string = await this.electron.ipcRenderer.invoke('app:safe-storage-decrypt', encrypted)
            return decrypted
        } catch {
            return null
        }
    }

    async secureDeletePassphrase (): Promise<void> {
        this.loadTouchIdCache()
        if (!this.touchIdCache) {
            return
        }

        this.touchIdCache.encrypted = []
        this.touchIdCache.timestamp = 0
        this.touchIdCache.bootTime = undefined
        await this.saveTouchIdCache()
    }

    getSecureStorageTimestamp (): number|null {
        this.loadTouchIdCache()
        return this.touchIdCache?.timestamp ?? null
    }

    getTouchIdSettings (): { enabled: boolean, expireDays: number, expireOnRestart: boolean } {
        this.loadTouchIdCache()
        return {
            enabled: this.touchIdCache?.enabled ?? false,
            expireDays: this.touchIdCache?.expireDays ?? 1,
            expireOnRestart: this.touchIdCache?.expireOnRestart ?? false,
        }
    }

    async setTouchIdSettings (enabled: boolean, expireDays: number, expireOnRestart?: boolean): Promise<void> {
        this.loadTouchIdCache()
        if (!this.touchIdCache) {
            this.touchIdCache = { encrypted: [], timestamp: 0 }
        }
        this.touchIdCache.enabled = enabled
        this.touchIdCache.expireDays = expireDays
        this.touchIdCache.expireOnRestart = expireOnRestart ?? false
        await this.saveTouchIdCache()
    }

    isTouchIdExpired (): boolean {
        this.loadTouchIdCache()
        if (!this.touchIdCache?.enabled) {
            return true
        }

        // Check restart-based expiration
        if (this.touchIdCache.expireOnRestart) {
            const storedBootTime = this.touchIdCache.bootTime
            const currentBootTime = this.getBootTime()
            // Allow 5 second tolerance for boot time comparison
            if (!storedBootTime || Math.abs(currentBootTime - storedBootTime) > 5000) {
                return true
            }
        }

        // Check time-based expiration
        const timestamp = this.touchIdCache.timestamp
        const expireDays = this.touchIdCache.expireDays ?? 1
        if (expireDays > 0 && timestamp) {
            const expireMs = expireDays * 24 * 60 * 60 * 1000
            if (Date.now() - timestamp > expireMs) {
                return true
            }
        }

        return false
    }
}

class ElectronFileUpload extends FileUpload {
    private size: number
    private mode: number
    private file: fs.FileHandle
    private buffer: Uint8Array
    private powerSaveBlocker = 0

    constructor (private filePath: string, private electron: ElectronService) {
        super()
        this.buffer = new Uint8Array(256 * 1024)
        this.powerSaveBlocker = electron.powerSaveBlocker.start('prevent-app-suspension')
    }

    async open (): Promise<void> {
        const stat = await fs.stat(this.filePath)
        this.size = stat.size
        this.mode = stat.mode
        this.setTotalSize(this.size)
        this.file = await fs.open(this.filePath, 'r')
    }

    getName (): string {
        return path.basename(this.filePath)
    }

    getMode (): number {
        return this.mode
    }

    getSize (): number {
        return this.size
    }

    async read (): Promise<Uint8Array> {
        const result = await this.file.read(this.buffer, 0, this.buffer.length, null)
        this.increaseProgress(result.bytesRead)
        if (this.getCompletedBytes() >= this.getSize()) {
            this.setCompleted(true)
        }
        return this.buffer.slice(0, result.bytesRead)
    }

    close (): void {
        this.electron.powerSaveBlocker.stop(this.powerSaveBlocker)
        this.file.close()
    }
}

class ElectronFileDownload extends FileDownload {
    private file: fs.FileHandle
    private powerSaveBlocker = 0

    constructor (
        private filePath: string,
        private mode: number,
        private size: number,
        private electron: ElectronService,
    ) {
        super()
        this.powerSaveBlocker = electron.powerSaveBlocker.start('prevent-app-suspension')
        this.setTotalSize(size)
    }

    async open (): Promise<void> {
        this.file = await fs.open(this.filePath, 'w', this.mode)
    }

    getName (): string {
        return path.basename(this.filePath)
    }

    getSize (): number {
        return this.size
    }

    async write (buffer: Uint8Array): Promise<void> {
        let pos = 0
        while (pos < buffer.length) {
            const result = await this.file.write(buffer, pos, buffer.length - pos, null)
            this.increaseProgress(result.bytesWritten)
            pos += result.bytesWritten
        }
        if (this.getCompletedBytes() >= this.getSize()) {
            this.setCompleted(true)
        }
    }

    close (): void {
        this.electron.powerSaveBlocker.stop(this.powerSaveBlocker)
        this.file.close()
    }
}

class ElectronDirectoryDownload extends DirectoryDownload {
    private powerSaveBlocker = 0

    constructor (
        private basePath: string,
        private name: string,
        estimatedSize: number,
        private electron: ElectronService,
        private zone: NgZone,
    ) {
        super()
        this.powerSaveBlocker = electron.powerSaveBlocker.start('prevent-app-suspension')
        this.setTotalSize(estimatedSize)
    }

    async open (): Promise<void> {
        await fs.mkdir(this.basePath, { recursive: true })
    }

    getName (): string {
        return this.name
    }

    getSize (): number {
        return this.getTotalSize()
    }

    async createDirectory (relativePath: string): Promise<void> {
        const fullPath = path.join(this.basePath, relativePath)
        await fs.mkdir(fullPath, { recursive: true })
    }

    async createFile (relativePath: string, mode: number, size: number): Promise<FileDownload> {
        const fullPath = path.join(this.basePath, relativePath)
        await fs.mkdir(path.dirname(fullPath), { recursive: true })

        const fileDownload = new ElectronFileDownload(fullPath, mode, size, this.electron)
        await wrapPromise(this.zone, fileDownload.open())
        return fileDownload
    }

    close (): void {
        this.electron.powerSaveBlocker.stop(this.powerSaveBlocker)
    }
}
