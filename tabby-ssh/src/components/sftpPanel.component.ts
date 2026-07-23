import * as C from 'constants'
import { posix as path } from 'path'
import { Component, Input, Output, EventEmitter, Inject, Optional } from '@angular/core'
import { ConfigService, FileUpload, DirectoryUpload, DirectoryDownload, MenuItemOptions, NotificationsService, PlatformService } from 'tabby-core'
import { SFTPSession, SFTPFile } from '../session/sftp'
import { SSHSession } from '../session/ssh'
import { SFTPContextMenuItemProvider } from '../api'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { SFTPCreateDirectoryModalComponent } from './sftpCreateDirectoryModal.component'

interface ChannelPool {
    acquire: () => Promise<SFTPSession>
    release: (ch: SFTPSession) => void
}

interface PathSegment {
    name: string
    path: string
}

@Component({
    selector: 'sftp-panel',
    templateUrl: './sftpPanel.component.pug',
    styleUrls: ['./sftpPanel.component.scss'],
})
export class SFTPPanelComponent {
    @Input() session: SSHSession
    @Output() closed = new EventEmitter<void>()
    sftp: SFTPSession
    fileList: SFTPFile[]|null = null
    filteredFileList: SFTPFile[] = []
    @Input() path = '/'
    @Output() pathChange = new EventEmitter<string>()
    pathSegments: PathSegment[] = []
    @Input() cwdDetectionAvailable = false
    editingPath: string|null = null
    showFilter = false
    filterText = ''

    constructor (
        private ngbModal: NgbModal,
        private notifications: NotificationsService,
        private config: ConfigService,
        public platform: PlatformService,
        @Optional() @Inject(SFTPContextMenuItemProvider) protected contextMenuProviders: SFTPContextMenuItemProvider[],
    ) {
        this.contextMenuProviders.sort((a, b) => a.weight - b.weight)
    }

    async ngOnInit (): Promise<void> {
        this.sftp = await this.session.openSFTP()
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
        while (p !== '/') {
            this.pathSegments.unshift({
                name: path.basename(p),
                path: p,
            })
            p = path.dirname(p)
        }

        this.fileList = null
        this.filteredFileList = []
        try {
            this.fileList = await this.sftp.readdir(this.path)
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

    getIcon (item: SFTPFile): string {
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
        this.navigate(path.dirname(this.path))
    }

    async open (item: SFTPFile): Promise<void> {
        if (item.isDirectory) {
            await this.navigate(item.fullPath)
        } else if (item.isSymlink) {
            const target = path.resolve(this.path, await this.sftp.readlink(item.fullPath))
            const stat = await this.sftp.stat(target)
            if (stat.isDirectory) {
                await this.navigate(item.fullPath)
            } else {
                await this.download(item.fullPath, stat.mode, stat.size)
            }
        } else {
            await this.download(item.fullPath, item.mode, item.size)
        }
    }

    async downloadItem (item: SFTPFile): Promise<void> {
        if (item.isDirectory) {
            await this.downloadFolder(item)
            return
        }

        if (item.isSymlink) {
            const target = path.resolve(this.path, await this.sftp.readlink(item.fullPath))
            const stat = await this.sftp.stat(target)
            if (stat.isDirectory) {
                await this.downloadFolder(item)
                return
            }
            await this.download(item.fullPath, stat.mode, stat.size)
            return
        }

        await this.download(item.fullPath, item.mode, item.size)
    }

    async openCreateDirectoryModal (): Promise<void> {
        const modal = this.ngbModal.open(SFTPCreateDirectoryModalComponent)
        const directoryName = await modal.result.catch(() => null)
        if (directoryName?.trim()) {
            this.sftp.mkdir(path.join(this.path, directoryName)).then(() => {
                this.notifications.notice('The directory was created successfully')
                this.navigate(path.join(this.path, directoryName))
            }).catch(() => {
                this.notifications.error('The directory could not be created')
            })
        }
    }

    async upload (): Promise<void> {
        const savedPath = this.path
        const transfers = await this.platform.startUpload({ multiple: true })
        try {
            await this.withChannelPool(pool =>
                this.runConcurrent(pool, transfers, (t, sftp) =>
                    this.uploadOrSkipCancelled(sftp, path.join(savedPath, t.getName()), t)))
        } catch (e) {
            // one failure aborts the queue — mark what never ran so nothing
            // sits in the transfers menu as "in progress" forever
            for (const t of transfers) {
                if (!t.isComplete() && !t.isFailed() && !t.isCancelled()) {
                    t.cancel()
                }
            }
            this.notifications.error(e.message)
        }
        if (this.path === savedPath) {
            await this.navigate(this.path)
        }
    }

    // SFTP round trips (open/close + windowing) dominate on many small files;
    // several files in flight avoid paying the latency serially. Rules that keep
    // the fragile engine alive: a channel only supports ONE operation in flight
    // (russh-sftp#15), so every pooled channel is a dedicated one (never the
    // shared browsing channel), a channel whose operation failed is never
    // reused, and closing a channel can starve pending requests on others — so
    // the pool is shared by all concurrent operations of this panel and torn
    // down sequentially only when the last one finishes.
    private poolChannels: SFTPSession[] = []
    private poolFree: SFTPSession[] = []
    private poolActiveOps = 0

    private async withChannelPool<R> (fn: (pool: ChannelPool) => Promise<R>): Promise<R> {
        this.poolActiveOps++
        const pool: ChannelPool = {
            acquire: async () => {
                const existing = this.poolFree.pop()
                if (existing) {
                    return existing
                }
                const ch = await this.session.openDedicatedSFTP()
                this.poolChannels.push(ch)
                return ch
            },
            release: ch => {
                this.poolFree.push(ch)
            },
        }
        try {
            return await fn(pool)
        } finally {
            this.poolActiveOps--
            if (!this.poolActiveOps) {
                const channels = this.poolChannels
                this.poolChannels = []
                this.poolFree = []
                for (const ch of channels) {
                    await ch.close().catch(() => null)
                }
            }
        }
    }

    private async runConcurrent<T> (pool: ChannelPool, items: T[], fn: (item: T, sftp: SFTPSession) => Promise<void>): Promise<void> {
        const configured = Math.floor(Number(this.config.store.ssh.sftpConcurrentTransfers))
        const limit = Math.min(8, Math.max(1, Number.isFinite(configured) ? configured : 1))
        const queue = [...items]
        const errors: Error[] = []
        const workersRan = await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
            const channel = await pool.acquire().catch(() => null)
            if (!channel) {
                return false
            }
            let channelFailed = false
            while (queue.length && !errors.length) {
                try {
                    await fn(queue.shift()!, channel)
                } catch (e) {
                    errors.push(e)
                    channelFailed = true
                }
            }
            if (!channelFailed) {
                pool.release(channel)
            }
            return true
        }))
        if (!workersRan.some(x => x)) {
            // no extra channels available — degrade to sequential on the shared one
            while (queue.length && !errors.length) {
                try {
                    await fn(queue.shift()!, this.sftp)
                } catch (e) {
                    errors.push(e)
                }
            }
        }
        if (errors.length) {
            throw errors[0]
        }
    }

    // each selected file has its own transfers-menu entry, so the user can cancel
    // one without meaning to abort the rest of the batch — swallow that one cancel
    private async uploadOrSkipCancelled (sftp: SFTPSession, remotePath: string, transfer: FileUpload): Promise<void> {
        try {
            await sftp.upload(remotePath, transfer)
        } catch (e) {
            if (!transfer.isCancelled()) {
                throw e
            }
        }
    }

    async uploadFolder (): Promise<void> {
        const transfer = await this.platform.startUploadDirectory()
        await this.uploadOneFolder(transfer)
    }

    async uploadOneFolder (transfer: DirectoryUpload, accumPath = ''): Promise<void> {
        try {
            await this.withChannelPool(pool => this.uploadOneFolderPooled(pool, transfer, accumPath))
        } catch (e) {
            this.cancelStrandedUploads(transfer)
            this.notifications.error(e.message)
        }
    }

    // a failure aborts the queue mid-way; anything not yet transferred would
    // otherwise stay "in progress" in the transfers menu with an open fd
    private cancelStrandedUploads (transfer: DirectoryUpload): void {
        for (const t of transfer.getChildrens()) {
            if (t instanceof DirectoryUpload) {
                this.cancelStrandedUploads(t)
            } else if (!t.isComplete() && !t.isFailed() && !t.isCancelled()) {
                t.cancel()
            }
        }
    }

    private async uploadOneFolderPooled (pool: ChannelPool, transfer: DirectoryUpload, accumPath = ''): Promise<void> {
        const savedPath = this.path
        const children = transfer.getChildrens()
        const files = children.filter(t => !(t instanceof DirectoryUpload))
        await this.runConcurrent(pool, files, (t, sftp) =>
            this.uploadOrSkipCancelled(sftp, path.posix.join(savedPath, accumPath, t.getName()), t as FileUpload))
        for (const t of children) {
            if (t instanceof DirectoryUpload) {
                try {
                    await this.sftp.mkdir(path.posix.join(savedPath, accumPath, t.getName()))
                } catch {
                    // Intentionally ignoring errors from making duplicate dirs.
                }
                await this.uploadOneFolderPooled(pool, t, path.posix.join(accumPath, t.getName()))
            }
        }
        if (this.path === savedPath) {
            await this.navigate(this.path)
        }
    }

    async download (itemPath: string, mode: number, size: number): Promise<boolean> {
        const transfer = await this.platform.startDownload(path.basename(itemPath), mode, size)
        if (!transfer) {
            return false
        }
        transfer.setRetryHandler(() => this.download(itemPath, mode, size))
        this.transferOnOwnChannel(sftp => sftp.download(itemPath, transfer)).catch(e => {
            // sftp.download already set the terminal state; this is a backstop
            if (!transfer.isCancelled() && !transfer.isFailed()) {
                transfer.markFailed(e.message)
            }
        })
        return true
    }

    // transfers must not share the browsing channel — a channel dies when two
    // operations are in flight on it at once (russh-sftp#15)
    private async transferOnOwnChannel (fn: (sftp: SFTPSession) => Promise<void>): Promise<void> {
        return this.withChannelPool(async pool => {
            const channel = await pool.acquire().catch(() => null)
            await fn(channel ?? this.sftp)
            if (channel) {
                pool.release(channel)
            }
        })
    }

    async downloadFolder (folder: SFTPFile): Promise<boolean> {
        // eslint-disable-next-line @typescript-eslint/init-declarations
        let startedTransfer: DirectoryDownload|null
        try {
            startedTransfer = await this.platform.startDownloadDirectory(folder.name, 0)
        } catch (error) {
            this.notifications.error(`Failed to download folder: ${error.message}`)
            return false
        }
        if (!startedTransfer) {
            return false
        }
        const transfer = startedTransfer

        transfer.setRetryHandler(() => this.downloadFolder(folder))

        this.downloadFolderTransfer(folder, transfer).catch(error => {
            // markFailed also closes the transfer, so every escape route out of
            // downloadFolderTransfer lands in a terminal state here
            if (!transfer.isCancelled() && !transfer.isFailed()) {
                transfer.markFailed(error.message)
            }
            if (!transfer.isCancelled()) {
                this.notifications.error(`Failed to download folder: ${error.message}`)
            }
        })
        return true
    }

    private async downloadFolderTransfer (folder: SFTPFile, transfer: DirectoryDownload): Promise<void> {
        await this.withChannelPool(async pool => {
            // size calculation runs on its own pooled channel when possible,
            // otherwise first — never concurrently with downloads on one channel
            let sizeCalculationPromise: Promise<unknown> = Promise.resolve()
            let sizeChannel: SFTPSession|null = null
            try {
                sizeChannel = await pool.acquire()
            } catch {
                await this.calculateFolderSizeAndUpdate(folder, transfer, this.sftp)
                transfer.setSizeCalculated()
            }
            if (sizeChannel) {
                const channel = sizeChannel
                sizeCalculationPromise = this.calculateFolderSizeAndUpdate(folder, transfer, channel)
                    .then(() => pool.release(channel))
                    .finally(() => transfer.setSizeCalculated())
            }
            const downloadPromise = this.downloadFolderRecursive(pool, folder, transfer, '')

            // settle BOTH before the pool tears channels down — closing a
            // channel while another still has requests in flight starves it
            const [sizeResult, downloadResult] = await Promise.allSettled([sizeCalculationPromise, downloadPromise])
            try {
                if (downloadResult.status === 'rejected') {
                    throw downloadResult.reason
                }
                if (sizeResult.status === 'rejected') {
                    throw sizeResult.reason
                }
                transfer.setStatus('')
                transfer.setCompleted(true)
            } catch (error) {
                if (!transfer.isCancelled()) {
                    transfer.markFailed(error.message)
                }
                throw error
            } finally {
                transfer.close()
            }
        })
    }

    private async calculateFolderSizeAndUpdate (folder: SFTPFile, transfer: DirectoryDownload, sftp: SFTPSession, sizeBefore = 0): Promise<number> {
        // totalSize accumulates across the whole recursion so the published
        // total only ever grows
        let totalSize = sizeBefore
        const items = await sftp.readdir(folder.fullPath)
        for (const item of items) {
            if (transfer.isCancelled()) {
                break
            }
            if (item.isDirectory) {
                totalSize = await this.calculateFolderSizeAndUpdate(item, transfer, sftp, totalSize)
            } else if (item.isSymlink) {
                // mirror the download rules: file targets count, directory targets are skipped
                const target = await sftp.stat(item.fullPath).catch(() => null)
                if (target && !target.isDirectory) {
                    totalSize += target.size
                }
            } else {
                totalSize += item.size
            }
            transfer.setTotalSize(totalSize)
        }
        return totalSize
    }

    private async downloadFolderRecursive (pool: ChannelPool, folder: SFTPFile, transfer: DirectoryDownload, relativePath: string): Promise<void> {
        const items = await this.sftp.readdir(folder.fullPath)

        // Symlinks to files are downloaded as their targets; symlinks to
        // directories are skipped (following them duplicates trees and can loop)
        const files = items.filter(item => !item.isDirectory)
        await this.runConcurrent(pool, files, async (item, sftp) => {
            if (transfer.isCancelled()) {
                throw new Error('Download cancelled')
            }
            let mode = item.mode
            let size = item.size
            if (item.isSymlink) {
                const target = await sftp.stat(item.fullPath).catch(() => null)
                if (!target || target.isDirectory) {
                    return
                }
                mode = target.mode
                size = target.size
            }
            const itemRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name
            transfer.setStatus(itemRelativePath)
            const fileDownload = await transfer.createFile(itemRelativePath, mode, size)
            await sftp.download(item.fullPath, fileDownload)
        })

        for (const item of items) {
            if (!item.isDirectory) {
                continue
            }
            if (transfer.isCancelled()) {
                throw new Error('Download cancelled')
            }
            const itemRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name
            transfer.setStatus(itemRelativePath)
            await transfer.createDirectory(itemRelativePath)
            await this.downloadFolderRecursive(pool, item, transfer, itemRelativePath)
        }
    }

    getModeString (item: SFTPFile): string {
        const s = 'SGdrwxrwxrwx'
        const e = '   ---------'
        const c = [
            0o4000, 0o2000, C.S_IFDIR,
            C.S_IRUSR, C.S_IWUSR, C.S_IXUSR,
            C.S_IRGRP, C.S_IWGRP, C.S_IXGRP,
            C.S_IROTH, C.S_IWOTH, C.S_IXOTH,
        ]
        let result = ''
        for (let i = 0; i < c.length; i++) {
            result += item.mode & c[i] ? s[i] : e[i]
        }
        return result
    }

    async buildContextMenu (item: SFTPFile): Promise<MenuItemOptions[]> {
        let items: MenuItemOptions[] = []
        for (const section of await Promise.all(this.contextMenuProviders.map(x => x.getItems(item, this)))) {
            items.push({ type: 'separator' })
            items = items.concat(section)
        }
        return items.slice(1)
    }

    async showContextMenu (item: SFTPFile, event: MouseEvent): Promise<void> {
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

    close (): void {
        this.closed.emit()
    }

    clearFilter (): void {
        this.showFilter = false
        this.filterText = ''
        this.updateFilteredList()
    }

    onFilterChange (): void {
        this.updateFilteredList()
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
