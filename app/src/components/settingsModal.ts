import { Component } from '@angular/core'
import { ElectronService } from 'services/electron'
import { HostAppService, PLATFORM_WINDOWS, PLATFORM_LINUX, PLATFORM_MAC } from 'services/hostApp'
import { ConfigService } from 'services/config'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'


@Component({
  selector: 'settings-modal',
  template: require('./settingsModal.pug'),
  styles: [require('./settingsModal.less')],
})
export class SettingsModalComponent {
    constructor(
        private modalInstance: NgbActiveModal,
        public config: ConfigService,
        hostApp: HostAppService,
        electron: ElectronService,
    ) {
        this.isWindows = hostApp.platform == PLATFORM_WINDOWS
        this.isMac = hostApp.platform == PLATFORM_MAC
        this.isLinux = hostApp.platform == PLATFORM_LINUX
        this.version = electron.app.getVersion()
        this.year = new Date().getFullYear()
    }

    isWindows: boolean
    isMac: boolean
    isLinux: boolean
    year: number
    version: string

    ngOnDestroy() {
        this.config.save()
    }

    close() {
        this.modalInstance.close()
    }
}
