import { Component, Inject } from '@angular/core'
import { ConfigService, ElectronService } from 'terminus-core'
import { IShell, ShellProvider, SessionPersistenceProvider } from '../api'

@Component({
    template: require('./shellSettingsTab.component.pug'),
})
export class ShellSettingsTabComponent {
    shells: IShell[] = []
    persistenceProviders: SessionPersistenceProvider[]

    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        @Inject(ShellProvider) private shellProviders: ShellProvider[],
        @Inject(SessionPersistenceProvider) persistenceProviders: SessionPersistenceProvider[],
    ) {
        this.persistenceProviders = this.config.enabledServices(persistenceProviders).filter(x => x.isAvailable())
    }

    async ngOnInit () {
        this.shells = (await Promise.all(this.config.enabledServices(this.shellProviders).map(x => x.provide()))).reduce((a, b) => a.concat(b))
    }

    pickWorkingDirectory () {
        let shell = this.shells.find(x => x.id === this.config.store.terminal.shell)
        console.log(shell)
        let paths = this.electron.dialog.showOpenDialog({
            defaultPath: shell.fsBase,
            properties: ['openDirectory', 'showHiddenFiles'],
        })
        if (paths) {
            this.config.store.terminal.workingDirectory = paths[0]
        }
    }
}
