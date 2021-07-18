/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { UACService } from '../services/uac.service'
import { LocalProfile } from '../api'
import { ElectronHostWindow, ElectronService } from 'tabby-electron'
import { ProfileSettingsComponent } from 'tabby-core'


/** @hidden */
@Component({
    template: require('./localProfileSettings.component.pug'),
})
export class LocalProfileSettingsComponent implements ProfileSettingsComponent<LocalProfile> {
    profile: LocalProfile

    constructor (
        public uac: UACService,
        private hostWindow: ElectronHostWindow,
        private electron: ElectronService,
    ) { }

    ngOnInit () {
        this.profile.options.env = this.profile.options.env ?? {}
        this.profile.options.args = this.profile.options.args ?? []
    }

    async pickWorkingDirectory (): Promise<void> {
        // const profile = await this.terminal.getProfileByID(this.config.store.terminal.profile)
        // const shell = this.shells.find(x => x.id === profile?.shell)
        // if (!shell) {
        //     return
        // }
        const paths = (await this.electron.dialog.showOpenDialog(
            this.hostWindow.getWindow(),
            {
                // TODO
                // defaultPath: shell.fsBase,
                properties: ['openDirectory', 'showHiddenFiles'],
            }
        )).filePaths
        this.profile.options.cwd = paths[0]
    }
}
