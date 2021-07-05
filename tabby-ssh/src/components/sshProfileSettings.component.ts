/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'

import { ConfigService, FileProvidersService, Platform, HostAppService, PromptModalComponent } from 'tabby-core'
import { PasswordStorageService } from '../services/passwordStorage.service'
import { ForwardedPortConfig, SSHAlgorithmType, ALGORITHM_BLACKLIST, SSHProfile } from '../api'
import * as ALGORITHMS from 'ssh2/lib/protocol/constants'

/** @hidden */
@Component({
    template: require('./sshProfileSettings.component.pug'),
})
export class SSHProfileSettingsComponent {
    Platform = Platform
    profile: SSHProfile
    hasSavedPassword: boolean
    useProxyCommand: boolean

    supportedAlgorithms: Record<string, string> = {}
    defaultAlgorithms: Record<string, string[]> = {}
    algorithms: Record<string, Record<string, boolean>> = {}
    jumpHosts: SSHProfile[]

    constructor (
        public hostApp: HostAppService,
        private config: ConfigService,
        private passwordStorage: PasswordStorageService,
        private ngbModal: NgbModal,
        private fileProviders: FileProvidersService,
    ) {
        for (const k of Object.values(SSHAlgorithmType)) {
            const supportedAlg = {
                [SSHAlgorithmType.KEX]: 'SUPPORTED_KEX',
                [SSHAlgorithmType.HOSTKEY]: 'SUPPORTED_SERVER_HOST_KEY',
                [SSHAlgorithmType.CIPHER]: 'SUPPORTED_CIPHER',
                [SSHAlgorithmType.HMAC]: 'SUPPORTED_MAC',
            }[k]
            const defaultAlg = {
                [SSHAlgorithmType.KEX]: 'DEFAULT_KEX',
                [SSHAlgorithmType.HOSTKEY]: 'DEFAULT_SERVER_HOST_KEY',
                [SSHAlgorithmType.CIPHER]: 'DEFAULT_CIPHER',
                [SSHAlgorithmType.HMAC]: 'DEFAULT_MAC',
            }[k]
            this.supportedAlgorithms[k] = ALGORITHMS[supportedAlg].filter(x => !ALGORITHM_BLACKLIST.includes(x)).sort()
            this.defaultAlgorithms[k] = ALGORITHMS[defaultAlg].filter(x => !ALGORITHM_BLACKLIST.includes(x))
        }
    }

    async ngOnInit () {
        this.jumpHosts = this.config.store.profiles.filter(x => x.type === 'ssh' && x !== this.profile)
        this.profile.options.algorithms = this.profile.options.algorithms ?? {}
        for (const k of Object.values(SSHAlgorithmType)) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!this.profile.options.algorithms[k]) {
                this.profile.options.algorithms[k] = this.defaultAlgorithms[k]
            }

            this.algorithms[k] = {}
            for (const alg of this.profile.options.algorithms[k]) {
                this.algorithms[k][alg] = true
            }
        }

        this.profile.options.auth = this.profile.options.auth ?? null
        this.profile.options.privateKeys ??= []

        this.useProxyCommand = !!this.profile.options.proxyCommand
        try {
            this.hasSavedPassword = !!await this.passwordStorage.loadPassword(this.profile)
        } catch (e) {
            console.error('Could not check for saved password', e)
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
        }
        if (!this.useProxyCommand) {
            this.profile.options.proxyCommand = undefined
        }
    }

    onForwardAdded (fw: ForwardedPortConfig) {
        this.profile.options.forwardedPorts = this.profile.options.forwardedPorts ?? []
        this.profile.options.forwardedPorts.push(fw)
    }

    onForwardRemoved (fw: ForwardedPortConfig) {
        this.profile.options.forwardedPorts = this.profile.options.forwardedPorts?.filter(x => x !== fw)
    }
}
