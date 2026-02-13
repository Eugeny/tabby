import { Component, Injector, Input } from '@angular/core'
import { BaseTabComponent, PlatformService } from 'tabby-core'
import { LocalFileSystem } from '../session/localFileSystem'
import { FileSystem } from '../api/fileSystem'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

@Component({
    selector: 'local-file-manager-tab',
    templateUrl: './localFileManagerTab.component.pug',
    styleUrls: ['./sftpPanel.component.scss'],
})
export class LocalFileManagerTabComponent extends BaseTabComponent {
    @Input() initialPath?: string

    leftPane: { fs: FileSystem, path: string } | null = null
    rightPane: { fs: FileSystem, path: string } | null = null
    private defaultPath: string = os.homedir()

    constructor (
        injector: Injector,
        public platform: PlatformService,
    ) {
        super(injector)
        this.setTitle('Local Files')
        this.initPanes()
    }

    private initPanes (): void {
        const localFs = new LocalFileSystem()

        const preferredPath = this.initialPath && fs.existsSync(this.initialPath) ? this.initialPath : null
        const homePath = os.homedir()
        const desktopPath = path.join(homePath, 'Desktop')
        this.defaultPath = preferredPath ?? (fs.existsSync(desktopPath) ? desktopPath : homePath)

        this.leftPane = {
            fs: localFs,
            path: this.defaultPath
        }

        this.rightPane = null
    }

    swapPanes (): void {
        const temp = this.leftPane
        this.leftPane = this.rightPane
        this.rightPane = temp
    }

    closeRightPane (): void {
        this.rightPane = null
    }

    showSplitView (): void {
        const localFs = new LocalFileSystem()
        this.rightPane = {
            fs: localFs,
            path: this.defaultPath
        }
    }

    async goToPath (pane: 'left' | 'right', targetPath: string): Promise<void> {
        const paneObj = pane === 'left' ? this.leftPane : this.rightPane
        if (paneObj) {
            paneObj.path = targetPath
        }
    }
}
