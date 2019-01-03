import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Subscription } from 'rxjs'
import { ConfigService, ElectronService, HostAppService, Platform } from 'terminus-core'
import { EditProfileModalComponent } from './editProfileModal.component'
import { IShell, Profile } from '../api'
import { TerminalService } from '../services/terminal.service'
import { UACService } from '../services/uac.service'

@Component({
    template: require('./shellSettingsTab.component.pug'),
})
export class ShellSettingsTabComponent {
    shells: IShell[] = []
    profiles: Profile[] = []
    Platform = Platform
    isConPTYAvailable: boolean
    private configSubscription: Subscription

    constructor (
        uac: UACService,
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
        this.isConPTYAvailable = uac.isAvailable
    }

    async ngOnInit () {
        this.shells = await this.terminalService.shells$.toPromise()
    }

    ngOnDestroy () {
        this.configSubscription.unsubscribe()
    }

    reload () {
        this.profiles = this.config.store.terminal.profiles
    }

    pickWorkingDirectory () {
        let shell = this.shells.find(x => x.id === this.config.store.terminal.shell)
        console.log(shell)
        let paths = this.electron.dialog.showOpenDialog(
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

    newProfile (shell: IShell) {
        let profile: Profile = {
            name: shell.name,
            sessionOptions: this.terminalService.optionsFromShell(shell),
        }
        this.profiles.push(profile)
        this.config.store.terminal.profiles = this.profiles
        this.config.save()
    }

    editProfile (profile: Profile) {
        let modal = this.ngbModal.open(EditProfileModalComponent)
        modal.componentInstance.profile = Object.assign({}, profile)
        modal.result.then(result => {
            Object.assign(profile, result)
            this.config.save()
        })
    }

    deleteProfile (profile: Profile) {
        this.profiles = this.profiles.filter(x => x !== profile)
        this.config.store.terminal.profiles = this.profiles
        this.config.save()
    }
}
