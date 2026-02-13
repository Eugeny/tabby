import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core'
import { SSHSession } from '../session/ssh'
import { SFTPSession } from '../session/sftp'
import { LocalFileSystem } from '../session/localFileSystem'
import { FileSystem } from '../api/fileSystem'
import * as os from 'os'

@Component({
    selector: 'sftp-panel',
    templateUrl: './sftpPanel.component.pug',
    styleUrls: ['./sftpPanel.component.scss'],
})
export class SFTPPanelComponent implements OnChanges {
    @Input() session: SSHSession
    @Input() path = '/'
    @Output() pathChange = new EventEmitter<string>()
    @Input() cwdDetectionAvailable = false
    @Output() closed = new EventEmitter<void>()

    sftp: SFTPSession | null = null
    localFileSystem: LocalFileSystem | null = null

    leftPane: { fs: FileSystem, path: string } | null = null
    rightPane: { fs: FileSystem, path: string } | null = null

    async ngOnInit (): Promise<void> {
        this.sftp = await this.session.openSFTP()
        const initialRemotePath = this.path || '/'
        this.leftPane = {
            fs: this.sftp,
            path: initialRemotePath,
        }
        this.rightPane = null
    }

    ngOnChanges (changes: SimpleChanges): void {
        if (!changes.path || !this.sftp) {
            return
        }
        const remotePane = this.getRemotePane()
        if (remotePane && changes.path.currentValue && remotePane.path !== changes.path.currentValue) {
            remotePane.path = changes.path.currentValue
        }
    }

    private getRemotePane (): { fs: FileSystem, path: string } | null {
        if (this.leftPane?.fs === this.sftp) {
            return this.leftPane
        }
        if (this.rightPane?.fs === this.sftp) {
            return this.rightPane
        }
        return null
    }

    onPanePathChange (pane: 'left'|'right', newPath: string): void {
        const paneObj = pane === 'left' ? this.leftPane : this.rightPane
        if (!paneObj) {
            return
        }
        paneObj.path = newPath
        if (this.sftp && paneObj.fs === this.sftp) {
            this.path = newPath
            this.pathChange.emit(newPath)
        }
    }

    showLocal (): void {
        this.localFileSystem = new LocalFileSystem()
        this.rightPane = {
            fs: this.localFileSystem,
            path: os.homedir(),
        }
    }

    showRemoteSplit (): void {
        this.showLocal()
    }

    swapPanes (): void {
        const temp = this.leftPane
        this.leftPane = this.rightPane
        this.rightPane = temp
    }

    closeLocal (): void {
        this.rightPane = null
        this.localFileSystem = null
    }

    close (): void {
        this.closed.emit()
    }
}
