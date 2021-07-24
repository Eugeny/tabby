import * as path from 'path'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as os from 'os'
import promiseIpc, { RendererProcessType } from 'electron-promise-ipc'
import { execFile } from 'mz/child_process'
import { Injectable, NgZone } from '@angular/core'
import { PlatformService, ClipboardContent, HostAppService, Platform, MenuItemOptions, MessageBoxOptions, MessageBoxResult, FileUpload, FileDownload, FileUploadOptions, wrapPromise } from 'tabby-core'
import { ElectronService } from '../services/electron.service'
import { ElectronHostWindow } from './hostWindow.service'
import { ShellIntegrationService } from './shellIntegration.service'
const fontManager = require('fontmanager-redux') // eslint-disable-line

/* eslint-disable block-scoped-var */

try {
    // eslint-disable-next-line no-var
    var windowsProcessTreeNative = require('windows-process-tree/build/Release/windows_process_tree.node')
    // eslint-disable-next-line no-var
    var wnr = require('windows-native-registry')
} catch { }

@Injectable()
export class ElectronPlatformService extends PlatformService {
    supportsWindowControls = true
    private configPath: string

    constructor (
        private hostApp: HostAppService,
        private hostWindow: ElectronHostWindow,
        private electron: ElectronService,
        private zone: NgZone,
        private shellIntegration: ShellIntegrationService,
    ) {
        super()
        this.configPath = path.join(electron.app.getPath('userData'), 'config.yaml')

        electron.ipcRenderer.on('host:display-metrics-changed', () => {
            this.zone.run(() => this.displayMetricsChanged.next())
        })
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

    exec (app: string, argv: string[]): void {
        execFile(app, argv)
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
        await fs.writeFile(this.configPath, content, 'utf8')
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
            let fonts = await new Promise<any[]>((resolve) => fontManager.findFonts({ monospace: true }, resolve))
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

    async startUpload (options?: FileUploadOptions): Promise<FileUpload[]> {
        options ??= { multiple: false }

        const properties: any[] = ['openFile', 'treatPackageAsDirectory']
        if (options.multiple) {
            properties.push('multiSelections')
        }

        const result = await this.electron.dialog.showOpenDialog(
            this.hostWindow.getWindow(),
            {
                buttonLabel: 'Select',
                properties,
            },
        )
        if (result.canceled) {
            return []
        }

        return Promise.all(result.filePaths.map(async p => {
            const transfer = new ElectronFileUpload(p, this.electron)
            await wrapPromise(this.zone, transfer.open())
            this.fileTransferStarted.next(transfer)
            return transfer
        }))
    }

    async startDownload (name: string, mode: number, size: number): Promise<FileDownload|null> {
        const result = await this.electron.dialog.showSaveDialog(
            this.hostWindow.getWindow(),
            {
                defaultPath: name,
            },
        )
        if (!result.filePath) {
            return null
        }
        const transfer = new ElectronFileDownload(result.filePath, mode, size, this.electron)
        await wrapPromise(this.zone, transfer.open())
        this.fileTransferStarted.next(transfer)
        return transfer
    }

    setErrorHandler (handler: (_: any) => void): void {
        this.electron.ipcRenderer.on('uncaughtException', (_$event, err) => {
            handler(err)
        })
    }
}

class ElectronFileUpload extends FileUpload {
    private size: number
    private mode: number
    private file: fs.FileHandle
    private buffer: Buffer
    private powerSaveBlocker = 0

    constructor (private filePath: string, private electron: ElectronService) {
        super()
        this.buffer = Buffer.alloc(256 * 1024)
        this.powerSaveBlocker = electron.powerSaveBlocker.start('prevent-app-suspension')
    }

    async open (): Promise<void> {
        const stat = await fs.stat(this.filePath)
        this.size = stat.size
        this.mode = stat.mode
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

    async read (): Promise<Buffer> {
        const result = await this.file.read(this.buffer, 0, this.buffer.length, null)
        this.increaseProgress(result.bytesRead)
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
    }

    async open (): Promise<void> {
        this.file = await fs.open(this.filePath, 'w', this.mode)
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

    async write (buffer: Buffer): Promise<void> {
        let pos = 0
        while (pos < buffer.length) {
            const result = await this.file.write(buffer, pos, buffer.length - pos, null)
            this.increaseProgress(result.bytesWritten)
            pos += result.bytesWritten
        }
    }

    close (): void {
        this.electron.powerSaveBlocker.stop(this.powerSaveBlocker)
        this.file.close()
    }
}
