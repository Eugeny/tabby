import '@vaadin/vaadin-context-menu'
import copyToClipboard from 'copy-text-to-clipboard'
import { Injectable, Inject } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { PlatformService, ClipboardContent, MenuItemOptions, MessageBoxOptions, MessageBoxResult, FileUpload, FileUploadOptions, FileDownload, HTMLFileUpload } from 'tabby-core'

// eslint-disable-next-line no-duplicate-imports
import type { ContextMenuElement, ContextMenuItem } from '@vaadin/vaadin-context-menu'

import { MessageBoxModalComponent } from './components/messageBoxModal.component'
import './styles.scss'


@Injectable()
export class WebPlatformService extends PlatformService {
    private menu: ContextMenuElement
    private contextMenuHandlers = new Map<ContextMenuItem, () => void>()
    private fileSelector: HTMLInputElement

    constructor (
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        @Inject('WEB_CONNECTOR') private connector: any,
        private ngbModal: NgbModal,
    ) {
        super()
        this.menu = window.document.createElement('vaadin-context-menu')
        this.menu.addEventListener('item-selected', e => {
            this.contextMenuHandlers.get(e.detail.value)?.()
        })
        document.body.appendChild(this.menu)

        this.fileSelector = document.createElement('input')
        this.fileSelector.type = 'file'
        this.fileSelector.style.visibility = 'hidden'
        document.body.appendChild(this.fileSelector)
    }

    readClipboard (): string {
        return ''
    }

    setClipboard (content: ClipboardContent): void {
        copyToClipboard(content.text)
    }

    async loadConfig (): Promise<string> {
        return this.connector.loadConfig()
    }

    async saveConfig (content: string): Promise<void> {
        await this.connector.saveConfig(content)
    }

    getOSRelease (): string {
        return '1.0'
    }

    openExternal (url: string): void {
        window.open(url)
    }

    getAppVersion (): string {
        return this.connector.getAppVersion()
    }

    async listFonts (): Promise<string[]> {
        return []
    }

    popupContextMenu (menu: MenuItemOptions[], event?: MouseEvent): void {
        this.contextMenuHandlers.clear()
        this.menu.items = menu
            .filter(x => x.type !== 'separator')
            .map(x => this.remapMenuItem(x))
        setTimeout(() => {
            this.menu.open(event)
        }, 10)
    }

    private remapMenuItem (item: MenuItemOptions): ContextMenuItem {
        const cmi = {
            text: item.label,
            disabled: !(item.enabled ?? true),
            checked: item.checked,
            children: item.submenu?.map(i => this.remapMenuItem(i)),
        }
        if (item.click) {
            this.contextMenuHandlers.set(cmi, item.click)
        }
        return cmi
    }

    async showMessageBox (options: MessageBoxOptions): Promise<MessageBoxResult> {
        const modal = this.ngbModal.open(MessageBoxModalComponent, {
            backdrop: 'static',
        })
        const instance: MessageBoxModalComponent = modal.componentInstance
        instance.options = options
        try {
            const response = await modal.result
            return { response }
        } catch {
            return { response: options.cancelId ?? 1 }
        }
    }

    quit (): void {
        window.close()
    }

    async startDownload (name: string, mode: number, size: number): Promise<FileDownload|null> {
        const transfer = new HTMLFileDownload(name, mode, size)
        this.fileTransferStarted.next(transfer)
        return transfer
    }

    startUpload (options?: FileUploadOptions): Promise<FileUpload[]> {
        return new Promise(resolve => {
            this.fileSelector.onchange = () => {
                const transfers: FileUpload[] = []
                const fileList = this.fileSelector.files!
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                for (let i = 0; i < (fileList.length ?? 0); i++) {
                    const file = fileList[i]
                    const transfer = new HTMLFileUpload(file)
                    this.fileTransferStarted.next(transfer)
                    transfers.push(transfer)
                    if (!options?.multiple) {
                        break
                    }
                }
                resolve(transfers)
            }
            this.fileSelector.click()
        })
    }

    setErrorHandler (handler: (_: any) => void): void {
        window.addEventListener('error', handler)
    }
}

class HTMLFileDownload extends FileDownload {
    private buffers: Buffer[] = []

    constructor (
        private name: string,
        private mode: number,
        private size: number,
    ) {
        super()
    }

    getName (): string {
        return this.name
    }

    getMode (): number {
        return this.mode
    }

    getSize (): number {
        return this.size
    }

    async write (buffer: Buffer): Promise<void> {
        this.buffers.push(Buffer.from(buffer))
        this.increaseProgress(buffer.length)
        if (this.isComplete()) {
            this.finish()
        }
    }

    finish () {
        const blob = new Blob(this.buffers, { type: 'application/octet-stream' })
        const element = window.document.createElement('a')
        element.href = window.URL.createObjectURL(blob)
        element.download = this.name
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    close (): void { }
}
