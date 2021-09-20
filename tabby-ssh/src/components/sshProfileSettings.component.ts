/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, ViewChild } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'

import { ConfigService, FileProvidersService, Platform, HostAppService, PromptModalComponent, PartialProfile } from 'tabby-core'
import { LoginScriptsSettingsComponent } from 'tabby-terminal'
import { PasswordStorageService } from '../services/passwordStorage.service'
import { ForwardedPortConfig, SSHAlgorithmType, SSHProfile } from '../api'
import { supportedAlgorithms } from '../algorithms'

/** @hidden */
@Component({
    template: require('./sshProfileSettings.component.pug'),
})
export class SSHProfileSettingsComponent {
    Platform = Platform
    profile: SSHProfile
    hasSavedPassword: boolean
    useProxyCommand: boolean

    supportedAlgorithms = supportedAlgorithms
    algorithms: Record<string, Record<string, boolean>> = {}
    jumpHosts: PartialProfile<SSHProfile>[]
    @ViewChild('loginScriptsSettings') loginScriptsSettings: LoginScriptsSettingsComponent|null

    constructor (
        public hostApp: HostAppService,
        private config: ConfigService,
        private passwordStorage: PasswordStorageService,
        private ngbModal: NgbModal,
        private fileProviders: FileProvidersService,
    ) { }

    async ngOnInit () {
        this.jumpHosts = this.config.store.profiles.filter(x => x.type === 'ssh' && x !== this.profile)
        for (const k of Object.values(SSHAlgorithmType)) {
            this.algorithms[k] = {}
            for (const alg of this.profile.options.algorithms?.[k] ?? []) {
                this.algorithms[k][alg] = true
            }
        }

        this.profile.options.auth = this.profile.options.auth ?? null
        this.profile.options.privateKeys ??= []

        this.useProxyCommand = !!this.profile.options.proxyCommand
        if (this.profile.options.user) {
            try {
                this.hasSavedPassword = !!await this.passwordStorage.loadPassword(this.profile)
            } catch (e) {
                console.error('Could not check for saved password', e)
            }
        }
    }

    async setPassword () {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = `Password for ${this.profile.options.user}@${this.profile.options.host}`
        modal.componentInstance.password = true
        try {
            const result = await modal.result
            if (result?.value) {
                this.passwordStorage.savePassword(this.profile, result.value)
                this.hasSavedPassword = true
            }
        } catch { }
    }

    clearSavedPassword () {
        this.hasSavedPassword = false
        this.passwordStorage.deletePassword(this.profile)
    }

    async addPrivateKey () {
        const ref = await this.fileProviders.selectAndStoreFile(`private key for ${this.profile.name}`)
        this.profile.options.privateKeys = [
            ...this.profile.options.privateKeys!,
            ref,
        ]
    }

    removePrivateKey (path: string) {
        this.profile.options.privateKeys = this.profile.options.privateKeys?.filter(x => x !== path)
    }

    save () {
        for (const k of Object.values(SSHAlgorithmType)) {
            this.profile.options.algorithms![k] = Object.entries(this.algorithms[k])
                .filter(([_, v]) => !!v)
                .map(([key, _]) => key)
            this.profile.options.algorithms![k].sort()
        }
        if (!this.useProxyCommand) {
            this.profile.options.proxyCommand = undefined
        }
        this.loginScriptsSettings?.save()
    }

    onForwardAdded (fw: ForwardedPortConfig) {
        this.profile.options.forwardedPorts = this.profile.options.forwardedPorts ?? []
        this.profile.options.forwardedPorts.push(fw)
    }

    onForwardRemoved (fw: ForwardedPortConfig) {
        this.profile.options.forwardedPorts = this.profile.options.forwardedPorts?.filter(x => x !== fw)
    }
}
