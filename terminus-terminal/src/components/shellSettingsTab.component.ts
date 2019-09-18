import slug from 'slug'
import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Subscription } from 'rxjs'
import { ConfigService, ElectronService, HostAppService, Platform } from 'terminus-core'
import { EditProfileModalComponent } from './editProfileModal.component'
import { Shell, Profile } from '../api/interfaces'
import { TerminalService } from '../services/terminal.service'
import { WIN_BUILD_CONPTY_SUPPORTED, WIN_BUILD_CONPTY_STABLE, isWindowsBuild } from '../utils'

/** @hidden */
@Component({
    template: require('./shellSettingsTab.component.pug'),
})
export class ShellSettingsTabComponent {
    shells: Shell[] = []
    profiles: Profile[] = []
    Platform = Platform
    isConPTYAvailable: boolean
    isConPTYStable: boolean
    slug = slug
    private configSubscription: Subscription

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        private electron: ElectronService,
        private terminalService: TerminalService,
        private ngbModal: NgbModal,
    ) {
        config.store.terminal.environment = config.store.terminal.environment || {}
        this.configSubscription = this.config.changed$.subscribe(() => {
            this.reload()
        })
        this.reload()

        this.isConPTYAvailable = isWindowsBuild(WIN_BUILD_CONPTY_SUPPORTED)
        this.isConPTYStable = isWindowsBuild(WIN_BUILD_CONPTY_STABLE)
    }

    async ngOnInit () {
        this.shells = await this.terminalService.shells$.toPromise()
    }

    ngOnDestroy () {
        this.configSubscription.unsubscribe()
    }

    async reload () {
        this.profiles = await this.terminalService.getProfiles(true)
    }

    pickWorkingDirectory () {
        const shell = this.shells.find(x => x.id === this.config.store.terminal.shell)
        if (!shell) {
            return
        }
        const paths = this.electron.dialog.showOpenDialog(
            this.hostApp.getWindow(),
            {
                defaultPath: shell.fsBase,
                properties: ['openDirectory', 'showHiddenFiles'],
            }
        )
        if (paths) {
            this.config.store.terminal.workingDirectory = paths[0]
        }
    }

    newProfile (shell: Shell) {
        const profile: Profile = {
            name: shell.name || '',
            sessionOptions: this.terminalService.optionsFromShell(shell),
        }
        this.config.store.terminal.profiles = [profile, ...this.config.store.terminal.profiles]
        this.config.save()
        this.reload()
    }

    editProfile (profile: Profile) {
        const modal = this.ngbModal.open(EditProfileModalComponent)
        modal.componentInstance.profile = Object.assign({}, profile)
        modal.result.then(result => {
            Object.assign(profile, result)
            this.config.save()
        })
    }

    deleteProfile (profile: Profile) {
        this.config.store.terminal.profiles = this.config.store.terminal.profiles.filter(x => x !== profile)
        this.config.save()
        this.reload()
    }
}
