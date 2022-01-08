/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, HostBinding } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { BaseComponent, ConfigService, PromptModalComponent, HostAppService, PlatformService, NotificationsService, TranslateService } from 'tabby-core'
import { Config, ConfigSyncService } from '../services/configSync.service'


/** @hidden */
@Component({
    selector: 'config-sync-settings-tab',
    template: require('./configSyncSettingsTab.component.pug'),
})
export class ConfigSyncSettingsTabComponent extends BaseComponent {
    connectionSuccessful: boolean|null = null
    connectionError: Error|null = null
    configs: Config[]|null = null

    @HostBinding('class.content-box') true

    constructor (
        public config: ConfigService,
        public platform: PlatformService,
        private configSync: ConfigSyncService,
        private hostApp: HostAppService,
        private ngbModal: NgbModal,
        private notifications: NotificationsService,
        private translate: TranslateService,
    ) {
        super()
    }

    async ngOnInit () {
        await this.testConnection()
        this.loadConfigs()
    }

    async testConnection () {
        if (!this.config.store.configSync.host || !this.config.store.configSync.token) {
            return
        }
        this.connectionSuccessful = null
        try {
            await this.configSync.getUser()
            this.connectionSuccessful = true
            this.loadConfigs()
        } catch (e) {
            this.connectionSuccessful = false
            this.connectionError = e
            this.configs = null
        }
    }

    async loadConfigs () {
        this.configs = await this.configSync.getConfigs()
    }

    async uploadAsNew () {
        let name = this.translate.instant('New config on {platform}', this.hostApp)
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = this.translate.instant('Name for the new config')
        modal.componentInstance.value = name
        name = (await modal.result)?.value
        if (!name) {
            return
        }
        const cfg = await this.configSync.createNewConfig(name)
        this.loadConfigs()
        this.configSync.setConfig(cfg)
        this.uploadAndSync(cfg)
    }

    async uploadAndSync (cfg: Config) {
        if (this.config.store.configSync.configID !== cfg.id) {
            if ((await this.platform.showMessageBox({
                type: 'warning',
                message: this.translate.instant('Overwrite the config on the remote side and start syncing?'),
                buttons: [
                    this.translate.instant('Overwrite remote and sync'),
                    this.translate.instant('Cancel'),
                ],
                defaultId: 1,
                cancelId: 1,
            })).response === 1) {
                return
            }
        }
        this.configSync.setConfig(cfg)
        await this.configSync.upload()
        this.loadConfigs()
        this.notifications.info(this.translate.instant('Config uploaded'))
    }

    async downloadAndSync (cfg: Config) {
        if ((await this.platform.showMessageBox({
            type: 'warning',
            message: this.translate.instant('Overwrite the local config and start syncing?'),
            buttons: [
                this.translate.instant('Overwrite local and sync'),
                this.translate.instant('Cancel'),
            ],
            defaultId: 1,
            cancelId: 1,
        })).response === 1) {
            return
        }
        this.configSync.setConfig(cfg)
        await this.configSync.download()
        this.notifications.info(this.translate.instant('Config downloaded'))
    }

    hasMatchingRemoteConfig () {
        return !!this.configs?.find(c => this.isActiveConfig(c))
    }

    isActiveConfig (c: Config) {
        return c.id === this.config.store.configSync.configID
    }

    openSyncHost () {
        if (this.config.store.configSync.host === 'https://api.tabby.sh') {
            this.platform.openExternal('https://tabby.sh/app')
        } else {
            this.platform.openExternal(this.config.store.configSync.host)
        }
    }
}
