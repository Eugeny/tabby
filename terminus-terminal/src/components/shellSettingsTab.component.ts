import { Component, Inject } from '@angular/core'
import { ConfigService } from 'terminus-core'
import { IShell, ShellProvider, SessionPersistenceProvider } from '../api'

@Component({
    template: require('./shellSettingsTab.component.pug'),
})
export class ShellSettingsTabComponent {
    shells: IShell[] = []
    persistenceProviders: SessionPersistenceProvider[]

    constructor (
        public config: ConfigService,
        @Inject(ShellProvider) private shellProviders: ShellProvider[],
        @Inject(SessionPersistenceProvider) persistenceProviders: SessionPersistenceProvider[],
    ) {
        this.persistenceProviders = this.config.enabledServices(persistenceProviders).filter(x => x.isAvailable())
    }

    async ngOnInit () {
        this.shells = (await Promise.all(this.config.enabledServices(this.shellProviders).map(x => x.provide()))).reduce((a, b) => a.concat(b))
    }
}
