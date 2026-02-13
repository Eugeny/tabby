import { Component, Input, Output, EventEmitter, Inject, Optional } from '@angular/core'
import { FileUpload, DirectoryUpload, DirectoryDownload, MenuItemOptions, NotificationsService, PlatformService, FileDownload } from 'tabby-core'
import { FileSystem, FileEntry } from '../api/fileSystem'
import { SFTPContextMenuItemProvider } from '../api'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { SFTPCreateDirectoryModalComponent } from './sftpCreateDirectoryModal.component'
import * as russh from 'russh'

interface PathSegment {
    name: string
    path: string
}

@Component({
    selector: 'file-browser-pane',
    templateUrl: './fileBrowserPane.component.pug',
    styleUrls: ['./sftpPanel.component.scss'],
})
export class FileBrowserPaneComponent {
    static dragState: {
        items: FileEntry[],
        sourceFileSystem: FileSystem,
        sourcePath: string
    } | null = null

    @Input() fileSystem: FileSystem
    fileList: FileEntry[]|null = null
    filteredFileList: FileEntry[] = []
    @Input() path = '/'
    @Output() pathChange = new EventEmitter<string>()
    pathSegments: PathSegment[] = []
    @Input() cwdDetectionAvailable = false
    @Input() paneType: 'left' | 'right' = 'left'
    editingPath: string|null = null
    showFilter = false
    filterText = ''
    isDragOver = false
    dragOverCounter = 0

    constructor (
        private ngbModal: NgbModal,
        private notifications: NotificationsService,
        public platform: PlatformService,
        @Optional() @Inject(SFTPContextMenuItemProvider) protected contextMenuProviders: SFTPContextMenuItemProvider[],
    ) {
        if (this.contextMenuProviders) {
            this.contextMenuProviders.sort((a, b) => a.weight - b.weight)
        }
    }

    async ngOnInit (): Promise<void> {
        try {
            await this.navigate(this.path)
        } catch (error) {
            console.warn('Could not navigate to', this.path, ':', error)
            this.notifications.error(error.message)
            await this.navigate('/')
        }
    }

    async navigate (newPath: string, fallbackOnError = true): Promise<void> {
        const previousPath = this.path
        this.path = newPath
        this.pathChange.next(this.path)

        this.clearFilter()

        let p = newPath
        this.pathSegments = []
        // Basic breadcrumb generation - needs improvement for non-root paths?
        // Assuming path starts with / or drive letter
        while (p !== '/' && p !== '.' && p !== this.fileSystem.dirname(p)) {
             this.pathSegments.unshift({
                name: this.fileSystem.basename(p),
                path: p,
            })
            p = this.fileSystem.dirname(p)
        }
        if (p === '/') {
             this.pathSegments.unshift({ name: '', path: '/' })
        } else {
             this.pathSegments.unshift({ name: p, path: p })
        }

        this.fileList = null
        this.filteredFileList = []
        try {
            this.fileList = await this.fileSystem.readdir(this.path)
        } catch (error) {
            this.notifications.error(error.message)
            if (previousPath && fallbackOnError) {
                this.navigate(previousPath, false)
            }
            return
        }

        const dirKey = a => a.isDirectory ? 1 : 0
        this.fileList.sort((a, b) =>
            dirKey(b) - dirKey(a) ||
            a.name.localeCompare(b.name))

        this.updateFilteredList()
    }

    getFileType (fileExtension: string): string {
        const codeExtensions = ['js', 'ts', 'py', 'java', 'cpp', 'h', 'cs', 'html', 'css', 'rb', 'php', 'swift', 'go', 'kt', 'sh', 'json', 'cc', 'c', 'xml']
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp']
        const pdfExtensions = ['pdf']
        const archiveExtensions = ['zip', 'rar', 'tar', 'gz']
        const wordExtensions = ['doc', 'docx']
        const videoExtensions = ['mp4', 'avi', 'mkv', 'mov']
        const powerpointExtensions = ['ppt', 'pptx']
        const textExtensions = ['txt', 'log']
        const audioExtensions = ['mp3', 'wav', 'flac']
        const excelExtensions = ['xls', 'xlsx']

        const lowerCaseExtension = fileExtension.toLowerCase()

        if (codeExtensions.includes(lowerCaseExtension)) {
            return 'code'
        } else if (imageExtensions.includes(lowerCaseExtension)) {
            return 'image'
        } else if (pdfExtensions.includes(lowerCaseExtension)) {
            return 'pdf'
        } else if (archiveExtensions.includes(lowerCaseExtension)) {
            return 'archive'
        } else if (wordExtensions.includes(lowerCaseExtension)) {
            return 'word'
        } else if (videoExtensions.includes(lowerCaseExtension)) {
            return 'video'
        } else if (powerpointExtensions.includes(lowerCaseExtension)) {
            return 'powerpoint'
        } else if (textExtensions.includes(lowerCaseExtension)) {
            return 'text'
        } else if (audioExtensions.includes(lowerCaseExtension)) {
            return 'audio'
        } else if (excelExtensions.includes(lowerCaseExtension)) {
            return 'excel'
        } else {
            return 'unknown'
        }
    }

    getIcon (item: FileEntry): string {
        if (item.isDirectory) {
            return 'fas fa-folder text-info'
        }
        if (item.isSymlink) {
            return 'fas fa-link text-warning'
        }
        const fileMatch = /\.([^.]+)$/.exec(item.name)
        const extension = fileMatch ? fileMatch[1] : null
        if (extension !== null) {
            const fileType = this.getFileType(extension)

            switch (fileType) {
                case 'unknown':
                    return 'fas fa-file'
                default:
                    return `fa-solid fa-file-${fileType} `
            }
        }
        return 'fas fa-file'
    }

    goUp (): void {
        this.navigate(this.fileSystem.dirname(this.path))
    }

    async open (item: FileEntry): Promise<void> {
        if (item.isDirectory) {
            await this.navigate(item.fullPath)
        } else {
            // TODO: Handle opening files? Or just download?
            // Existing logic downloads and opens?
             await this.download(item.fullPath, item.mode, item.size)
        }
    }

    async openCreateDirectoryModal (): Promise<void> {
        const modal = this.ngbModal.open(SFTPCreateDirectoryModalComponent)
        const directoryName = await modal.result.catch(() => null)
        if (directoryName?.trim()) {
            this.fileSystem.mkdir(this.fileSystem.join(this.path, directoryName)).then(() => {
                this.notifications.notice('The directory was created successfully')
                this.navigate(this.fileSystem.join(this.path, directoryName))
            }).catch(() => {
                this.notifications.error('The directory could not be created')
            })
        }
    }

    async upload (): Promise<void> {
        const transfers = await this.platform.startUpload({ multiple: true })
        await Promise.all(transfers.map(t => this.uploadOne(t)))
    }

    async uploadFolder (): Promise<void> {
        const transfer = await this.platform.startUploadDirectory()
        await this.uploadOneFolder(transfer)
    }

    async uploadOneFolder (transfer: DirectoryUpload, accumPath = ''): Promise<void> {
        const savedPath = this.path
        for(const t of transfer.getChildrens()) {
            if (t instanceof DirectoryUpload) {
                try {
                    await this.fileSystem.mkdir(this.fileSystem.join(this.path, accumPath, t.getName()))
                } catch {
                    // Intentionally ignoring errors from making duplicate dirs.
                }
                await this.uploadOneFolder(t, this.fileSystem.join(accumPath, t.getName()))
            } else {
                await this.performUpload(this.fileSystem.join(this.path, accumPath, t.getName()), t)
            }
        }
        if (this.path === savedPath) {
            await this.navigate(this.path)
        }
    }

    async uploadOne (transfer: FileUpload): Promise<void> {
        const savedPath = this.path
        await this.performUpload(this.fileSystem.join(this.path, transfer.getName()), transfer)
        if (this.path === savedPath) {
            await this.navigate(this.path)
        }
    }

    async download (itemPath: string, mode: number, size: number): Promise<void> {
        const transfer = await this.platform.startDownload(this.fileSystem.basename(itemPath), mode, size)
        if (!transfer) {
            return
        }
        await this.performDownload(itemPath, transfer)
    }

    async downloadFolder (folder: FileEntry): Promise<void> {
        try {
            const transfer = await this.platform.startDownloadDirectory(folder.name, 0)
            if (!transfer) {
                return
            }

            const sizeCalculationPromise = this.calculateFolderSizeAndUpdate(folder, transfer)
            const downloadPromise = this.downloadFolderRecursive(folder, transfer, '')

            try {
                await Promise.all([sizeCalculationPromise, downloadPromise])
                transfer.setStatus('')
                transfer.setCompleted(true)
            } catch (error) {
                transfer.cancel()
                throw error
            } finally {
                transfer.close()
            }
        } catch (error) {
            this.notifications.error(`Failed to download folder: ${error.message}`)
            throw error
        }
    }

    private async calculateFolderSizeAndUpdate (folder: FileEntry, transfer: DirectoryDownload) {
        let totalSize = 0
        const items = await this.fileSystem.readdir(folder.fullPath)
        for (const item of items) {
            if (item.isDirectory) {
                totalSize += await this.calculateFolderSizeAndUpdate(item, transfer)
            } else {
                totalSize += item.size
            }
            transfer.setTotalSize(totalSize)
        }
        return totalSize
    }

    private async downloadFolderRecursive (folder: FileEntry, transfer: DirectoryDownload, relativePath: string): Promise<void> {
        const items = await this.fileSystem.readdir(folder.fullPath)

        for (const item of items) {
            if (transfer.isCancelled()) {
                throw new Error('Download cancelled')
            }

            const itemRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name

            transfer.setStatus(itemRelativePath)
            if (item.isDirectory) {
                await transfer.createDirectory(itemRelativePath)
                await this.downloadFolderRecursive(item, transfer, itemRelativePath)
            } else {
                const fileDownload = await transfer.createFile(itemRelativePath, item.mode, item.size)
                await this.performDownload(item.fullPath, fileDownload)
            }
        }
    }

    // Generic transfer implementation
    async performUpload (path: string, transfer: FileUpload): Promise<void> {
        const tempPath = path + '.tabby-upload'
        try {
            const handle = await this.fileSystem.open(tempPath, russh.OPEN_WRITE | russh.OPEN_CREATE)
            while (true) {
                const chunk = await transfer.read()
                if (!chunk.length) {
                    break
                }
                await handle.write(chunk)
            }
            await handle.close()
            await this.fileSystem.unlink(path).catch(() => null)
            await this.fileSystem.rename(tempPath, path)
            transfer.close()
        } catch (e) {
            transfer.cancel()
            this.fileSystem.unlink(tempPath).catch(() => null)
            throw e
        }
    }

    async performDownload (path: string, transfer: FileDownload): Promise<void> {
        try {
            const handle = await this.fileSystem.open(path, russh.OPEN_READ)
            while (true) {
                const chunk = await handle.read()
                if (!chunk.length) {
                    break
                }
                await transfer.write(chunk)
            }
            transfer.close()
            handle.close()
        } catch (e) {
            transfer.cancel()
            throw e
        }
    }

    getModeString (item: FileEntry): string {
        const s = 'SGdrwxrwxrwx'
        const e = '   ---------'
        const c = [
            0o4000, 0o2000, 0o40000,
            0o400, 0o200, 0o100,
            0o40, 0o20, 0o10,
            0o4, 0o2, 0o1,
        ]
        let result = ''
        for (let i = 0; i < 12; i++) {
            result += (item.mode & c[i]) ? s[i] : e[i]
        }
        return result
    }

    async buildContextMenu (item: FileEntry): Promise<MenuItemOptions[]> {
        if (!this.contextMenuProviders) return []
        let items: MenuItemOptions[] = []
        for (const section of await Promise.all(this.contextMenuProviders.map(x => x.getItems(item, this as any)))) { // Cast this to SFTPPanelComponent compatible type?
             items.push({ type: 'separator' })
             items = items.concat(section)
        }
        return items.slice(1)
    }

    async showContextMenu (item: FileEntry, event: MouseEvent): Promise<void> {
        event.preventDefault()
        this.platform.popupContextMenu(await this.buildContextMenu(item), event)
    }

    get shouldShowCWDTip (): boolean {
        return !window.localStorage.sshCWDTipDismissed
    }

    dismissCWDTip (): void {
        window.localStorage.sshCWDTipDismissed = 'true'
    }

    editPath (): void {
        this.editingPath = this.path
    }

    confirmPath (): void {
        if (this.editingPath === null) {
            return
        }
        this.navigate(this.editingPath)
        this.editingPath = null
    }

    clearFilter (): void {
        this.showFilter = false
        this.filterText = ''
        this.updateFilteredList()
    }

    onFilterChange (): void {
        this.updateFilteredList()
    }

    onDragStart (event: DragEvent, item: FileEntry): void {
        if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', item.name)
            event.dataTransfer.effectAllowed = 'copy'
            // 设置拖拽时的自定义图像
            event.dataTransfer.setDragImage(event.target as HTMLElement, 0, 0)
        }
        FileBrowserPaneComponent.dragState = {
            items: [item],
            sourceFileSystem: this.fileSystem,
            sourcePath: this.path
        }
    }

    onDragOver (event: DragEvent): void {
        if (FileBrowserPaneComponent.dragState && event.dataTransfer) {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
        }
    }

    onDragEnter (event: DragEvent): void {
        if (FileBrowserPaneComponent.dragState) {
            this.dragOverCounter++
            this.isDragOver = true
        }
    }

    onDragLeave (event: DragEvent): void {
        if (FileBrowserPaneComponent.dragState) {
            this.dragOverCounter--
            if (this.dragOverCounter <= 0) {
                this.isDragOver = false
                this.dragOverCounter = 0
            }
        }
    }

    async onDrop (event: DragEvent): Promise<void> {
        const state = FileBrowserPaneComponent.dragState
        if (!state) return
        event.preventDefault()
        event.stopPropagation()
        FileBrowserPaneComponent.dragState = null
        this.isDragOver = false
        this.dragOverCounter = 0

        // 处理外部文件拖入（从操作系统拖入）
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            await this.handleExternalFilesDrop(event.dataTransfer.files)
            return
        }

        // 处理内部拖拽（从一个面板拖到另一个面板）
        await this.handleInternalDrop(state)
    }

    async handleExternalFilesDrop (files: FileList): Promise<void> {
        // 从操作系统拖入文件
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const targetPath = this.fileSystem.join(this.path, file.name)

            // 检查文件是否已存在
            const shouldProceed = await this.checkFileConflict(file.name, targetPath)
            if (!shouldProceed) continue

            try {
                // 读取文件内容并上传
                const arrayBuffer = await file.arrayBuffer()
                const uint8Array = new Uint8Array(arrayBuffer)
                await this.writeFileContent(targetPath, uint8Array)
                this.notifications.notice(`Uploaded ${file.name}`)
            } catch (e) {
                this.notifications.error(`Failed to upload ${file.name}: ${e.message}`)
            }
        }
        this.navigate(this.path)
    }

    async handleInternalDrop (state: typeof FileBrowserPaneComponent.dragState): Promise<void> {
        if (!state) return

        for (const item of state.items) {
            const sourceFull = item.fullPath
            const targetFull = this.fileSystem.join(this.path, item.name)

            // 如果是同一个文件系统且路径相同，跳过
            if (state.sourceFileSystem === this.fileSystem && sourceFull === targetFull) {
                continue
            }

            // 检查文件冲突
            const shouldProceed = await this.checkFileConflict(item.name, targetFull)
            if (!shouldProceed) continue

            try {
                if (item.isDirectory) {
                    await this.copyDirectory(state.sourceFileSystem, sourceFull, this.fileSystem, targetFull)
                } else {
                    await this.copyFile(state.sourceFileSystem, sourceFull, this.fileSystem, targetFull)
                }
                this.notifications.notice(`Copied ${item.name}`)
            } catch (e) {
                this.notifications.error(`Could not copy ${item.name}: ${e.message}`)
            }
        }

        this.navigate(this.path)
    }

    async checkFileConflict (fileName: string, targetPath: string): Promise<boolean> {
        try {
            await this.fileSystem.stat(targetPath)
            // 文件已存在，显示冲突提示
            const result = await this.platform.showMessageBox({
                type: 'warning',
                message: `File "${fileName}" already exists in the destination.`,
                detail: `Do you want to overwrite it?`,
                buttons: ['Overwrite', 'Skip', 'Cancel'],
                defaultId: 0,
                cancelId: 2,
            })
            if (result.response === 1) return false // Skip
            if (result.response === 2) return false // Cancel
            return true // Overwrite
        } catch {
            // 文件不存在，可以安全复制
            return true
        }
    }

    async writeFileContent (path: string, content: Uint8Array): Promise<void> {
        const tempPath = path + '.tabby-upload'
        try {
            const handle = await this.fileSystem.open(tempPath, russh.OPEN_WRITE | russh.OPEN_CREATE)
            await handle.write(content)
            await handle.close()
            await this.fileSystem.unlink(path).catch(() => null)
            await this.fileSystem.rename(tempPath, path)
        } catch (e) {
            this.fileSystem.unlink(tempPath).catch(() => null)
            throw e
        }
    }

    async copyFile (sourceFs: FileSystem, sourcePath: string, targetFs: FileSystem, targetPath: string): Promise<void> {
        const sourceHandle = await sourceFs.open(sourcePath, russh.OPEN_READ)
        const targetHandle = await targetFs.open(targetPath, russh.OPEN_WRITE | russh.OPEN_CREATE | russh.OPEN_TRUNCATE)
        
        try {
            while (true) {
                const chunk = await sourceHandle.read()
                if (chunk.length === 0) break
                await targetHandle.write(chunk)
            }
        } finally {
            await sourceHandle.close()
            await targetHandle.close()
        }
    }

    async copyDirectory (sourceFs: FileSystem, sourcePath: string, targetFs: FileSystem, targetPath: string): Promise<void> {
        await targetFs.mkdir(targetPath).catch(() => null)
        const entries = await sourceFs.readdir(sourcePath)
        for (const entry of entries) {
            if (entry.isDirectory) {
                await this.copyDirectory(sourceFs, entry.fullPath, targetFs, targetFs.join(targetPath, entry.name))
            } else {
                await this.copyFile(sourceFs, entry.fullPath, targetFs, targetFs.join(targetPath, entry.name))
            }
        }
    }
    
    private updateFilteredList (): void {
        if (!this.fileList) {
            this.filteredFileList = []
            return
        }

        if (!this.showFilter || this.filterText.trim() === '') {
            this.filteredFileList = this.fileList
            return
        }

        this.filteredFileList = this.fileList.filter(item =>
            item.name.toLowerCase().includes(this.filterText.toLowerCase()),
        )
    }
}
