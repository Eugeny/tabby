import { Component } from '@angular/core'
import { ElectronService } from 'services/electron'
import { HostAppService, PLATFORM_WINDOWS, PLATFORM_LINUX, PLATFORM_MAC } from 'services/hostApp'
import { ConfigService } from 'services/config'
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/debounceTime'
import 'rxjs/add/operator/distinctUntilChanged'
const childProcessPromise = nodeRequire('child-process-promise')


@Component({
  selector: 'settings-pane',
  template: require('./settingsPane.pug'),
  styles: [require('./settingsPane.less')],
})
export class SettingsPaneComponent {
    isWindows: boolean
    isMac: boolean
    isLinux: boolean
    year: number
    version: string
    fonts: string[] = []
    restartRequested: boolean
    globalHotkey = ['Ctrl+Shift+G']

    constructor(
        public config: ConfigService,
        private electron: ElectronService,
        hostApp: HostAppService,
    ) {
        this.isWindows = hostApp.platform == PLATFORM_WINDOWS
        this.isMac = hostApp.platform == PLATFORM_MAC
        this.isLinux = hostApp.platform == PLATFORM_LINUX
        this.version = electron.app.getVersion()
        this.year = new Date().getFullYear()
    }

    ngOnInit () {
        childProcessPromise.exec('fc-list :spacing=mono').then((result) => {
            this.fonts = result.stdout
                .split('\n')
                .filter((x) => !!x)
                .map((x) => x.split(':')[1].trim())
                .map((x) => x.split(',')[0].trim())
            this.fonts.sort()
        })
    }

    fontAutocomplete = (text$: Observable<string>) => {
        return text$
          .debounceTime(200)
          .distinctUntilChanged()
          .map(query => this.fonts.filter(v => new RegExp(query, 'gi').test(v)))
          .map(list => Array.from(new Set(list)))
    }

    ngOnDestroy () {
        this.config.save()
    }

    requestRestart () {
        this.restartRequested = true
    }

    restartApp () {
        this.electron.app.relaunch()
        this.electron.app.exit()
    }
}
