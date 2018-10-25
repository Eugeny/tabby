import { Component, Inject } from '@angular/core'
import { Subscription } from 'rxjs'
import { ConfigService, ElectronService } from 'terminus-core'
import { IShell, ShellProvider, SessionPersistenceProvider } from '../api'

@Component({
    template: require('./shellSettingsTab.component.pug'),
})
export class ShellSettingsTabComponent {
    shells: IShell[] = []
    persistenceProviders: SessionPersistenceProvider[]

    environmentVars: {key: string, value: string}[] = []
    private configSubscription: Subscription

    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        @Inject(ShellProvider) private shellProviders: ShellProvider[],
        @Inject(SessionPersistenceProvider) persistenceProviders: SessionPersistenceProvider[],
    ) {
        this.persistenceProviders = this.config.enabledServices(persistenceProviders).filter(x => x.isAvailable())

        config.store.terminal.environment = config.store.terminal.environment || {}
        this.reloadEnvironment()
        this.configSubscription = config.changed$.subscribe(() => this.reloadEnvironment())
    }

    async ngOnInit () {
        this.shells = (await Promise.all(this.config.enabledServices(this.shellProviders).map(x => x.provide()))).reduce((a, b) => a.concat(b))
    }

    ngOnDestroy () {
        this.configSubscription.unsubscribe()
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

    reloadEnvironment () {
        this.environmentVars = Object.entries(this.config.store.terminal.environment).map(([k, v]) => ({ key: k, value: v as string }))
    }

    saveEnvironment () {
        this.config.store.terminal.environment = {}
        for (let pair of this.environmentVars) {
            this.config.store.terminal.environment[pair.key] = pair.value
        }
    }

    addEnvironmentVar () {
        this.environmentVars.push({ key: '', value: '' })
    }

    removeEnvironmentVar (key: string) {
        this.environmentVars = this.environmentVars.filter(x => x.key !== key)
        this.saveEnvironment()
    }
}
