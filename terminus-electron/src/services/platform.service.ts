import * as path from 'path'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as os from 'os'
import promiseIpc from 'electron-promise-ipc'
import { execFile } from 'mz/child_process'
import { Injectable } from '@angular/core'
import { PlatformService, ClipboardContent, HostAppService, Platform, ElectronService, MenuItemOptions, MessageBoxOptions, MessageBoxResult, FileUpload } from 'terminus-core'
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
    private userPluginsPath: string = (window as any).userPluginsPath
    private configPath: string

    constructor (
        private hostApp: HostAppService,
        private electron: ElectronService,
    ) {
        super()
        this.configPath = path.join(electron.app.getPath('userData'), 'config.yaml')
    }

    readClipboard (): string {
        return this.electron.clipboard.readText()
    }

    setClipboard (content: ClipboardContent): void {
        require('@electron/remote').clipboard.write(content)
    }

    async installPlugin (name: string, version: string): Promise<void> {
        await (promiseIpc as any).send('plugin-manager:install', this.userPluginsPath, name, version)
    }

    async uninstallPlugin (name: string): Promise<void> {
        await (promiseIpc as any).send('plugin-manager:uninstall', this.userPluginsPath, name)
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
        return false
    }

    async installShellIntegration (): Promise<void> {
        throw new Error('Not implemented')
    }

    async uninstallShellIntegration (): Promise<void> {
        throw new Error('Not implemented')
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
        this.electron.Menu.buildFromTemplate(menu.map(item => ({
            ...item,
        }))).popup({})
    }

    async showMessageBox (options: MessageBoxOptions): Promise<MessageBoxResult> {
        return this.electron.dialog.showMessageBox(this.hostApp.getWindow(), options)
    }

    quit (): void {
        this.electron.app.exit(0)
    }

    async startUpload (): Promise<FileUpload[]> {
        const result = await this.electron.dialog.showOpenDialog(
            this.hostApp.getWindow(),
            {
                buttonLabel: 'Select',
                properties: ['multiSelections', 'openFile', 'treatPackageAsDirectory'],
            },
        )
        if (result.canceled) {
            return []
        }

        return Promise.all(result.filePaths.map(async path => {
            const t = new ElectronFileUpload(path)
            await t.open()
            return t
        }))
    }
}

class ElectronFileUpload extends FileUpload {
    private size: number
    private file: fs.FileHandle
    private buffer: Buffer

    constructor (private filePath: string) {
        super()
        this.buffer = Buffer.alloc(256 * 1024)
    }

    async open (): Promise<void> {
        this.size = (await fs.stat(this.filePath)).size
        this.file = await fs.open(this.filePath, 'r')
    }

    getName (): string {
        return path.basename(this.filePath)
    }

    getSize (): number {
        return this.size
    }

    async read (): Promise<Buffer> {
        const result = await this.file.read(this.buffer, 0, this.buffer.length, null)
        this.increaseProgress(result.bytesRead)
        console.log(result)
        return this.buffer.slice(0, result.bytesRead)
    }

    close (): void {
        this.file.close()
    }
}

class ElectronFileDownload extends FileDownload {
    private size: number
    private file: fs.FileHandle
    private buffer: Buffer

    constructor (private filePath: string) {
        super()
        this.buffer = Buffer.alloc(256 * 1024)
    }

    async open (): Promise<void> {
        this.size = (await fs.stat(this.filePath)).size
        this.file = await fs.open(this.filePath, 'r')
    }

    getName (): string {
        return path.basename(this.filePath)
    }

    getSize (): number {
        return this.size
    }

    async read (): Promise<Buffer> {
        const result = await this.file.read(this.buffer, 0, this.buffer.length, null)
        this.increaseProgress(result.bytesRead)
        console.log(result)
        return this.buffer.slice(0, result.bytesRead)
    }

    close (): void {
        this.file.close()
    }
}
