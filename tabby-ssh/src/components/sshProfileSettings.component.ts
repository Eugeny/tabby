/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, ViewChild } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { firstBy } from 'thenby'

import { FileProvidersService, Platform, HostAppService, PromptModalComponent, PartialProfile, ProfilesService } from 'tabby-core'
import { LoginScriptsSettingsComponent } from 'tabby-terminal'
import { PasswordStorageService } from '../services/passwordStorage.service'
import { ForwardedPortConfig, SSHAlgorithmType, SSHProfile } from '../api'
import { supportedAlgorithms } from '../algorithms'

/** @hidden */
@Component({
    templateUrl: './sshProfileSettings.component.pug',
})
export class SSHProfileSettingsComponent {
    Platform = Platform
    profile: SSHProfile
    hasSavedPassword: boolean

    connectionMode: 'direct'|'proxyCommand'|'jumpHost'|'socksProxy'|'httpProxy' = 'direct'

    supportedAlgorithms = supportedAlgorithms
    algorithms: Record<string, Record<string, boolean>> = {}
    jumpHosts: PartialProfile<SSHProfile>[]
    @ViewChild('loginScriptsSettings') loginScriptsSettings: LoginScriptsSettingsComponent|null

    constructor (
        public hostApp: HostAppService,
        private profilesService: ProfilesService,
        private passwordStorage: PasswordStorageService,
        private ngbModal: NgbModal,
        private fileProviders: FileProvidersService,
    ) { }

    async ngOnInit () {
        this.jumpHosts = (await this.profilesService.getProfiles({ includeBuiltin: false })).filter(x => x.type === 'ssh' && x !== this.profile)
        this.jumpHosts.sort(firstBy(x => this.getJumpHostLabel(x)))

        for (const k of Object.values(SSHAlgorithmType)) {
            this.algorithms[k] = {}
            for (const alg of this.profile.options.algorithms?.[k] ?? []) {
                this.algorithms[k][alg] = true
            }
        }

        this.profile.options.auth = this.profile.options.auth ?? null
        this.profile.options.privateKeys ??= []

        if (this.profile.options.proxyCommand) {
            this.connectionMode = 'proxyCommand'
        } else if (this.profile.options.jumpHost) {
            this.connectionMode = 'jumpHost'
        } else if (this.profile.options.socksProxyHost) {
            this.connectionMode = 'socksProxy'
        } else if (this.profile.options.httpProxyHost) {
            this.connectionMode = 'httpProxy'
        }

        if (this.profile.options.user) {
            try {
                this.hasSavedPassword = !!await this.passwordStorage.loadPassword(this.profile)
            } catch (e) {
                console.error('Could not check for saved password', e)
            }
        }
    }

    getJumpHostLabel (p: PartialProfile<SSHProfile>) {
        return p.group ? `${this.profilesService.resolveProfileGroupName(p.group)} / ${p.name}` : p.name
    }

    async setPassword () {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = `Password for ${this.profile.options.user}@${this.profile.options.host}`
        modal.componentInstance.password = true
        try {
            const result = await modal.result.catch(() => null)
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
        const ref = await this.fileProviders.selectAndStoreFile(`private key for ${this.profile.name}`).catch(() => null)
        if (ref) {
            this.profile.options.privateKeys = [
                ...this.profile.options.privateKeys!,
                ref,
            ]
        }
    }

    removePrivateKey (path: string) {
        this.profile.options.privateKeys = this.profile.options.privateKeys?.filter(x => x !== path)
    }

    save () {
        for (const k of Object.values(SSHAlgorithmType)) {
            this.profile.options.algorithms![k] = Object.entries(this.algorithms[k])
                .filter(([_, v]) => !!v)
                .map(([key, _]) => key)
            if(k !== SSHAlgorithmType.COMPRESSION) { this.profile.options.algorithms![k].sort() }
        }

        if (this.connectionMode !== 'jumpHost') {
            this.profile.options.jumpHost = undefined
        }
        if (this.connectionMode !== 'proxyCommand') {
            this.profile.options.proxyCommand = undefined
        }
        if (this.connectionMode !== 'socksProxy') {
            this.profile.options.socksProxyHost = undefined
            this.profile.options.socksProxyPort = undefined
        }
        if (this.connectionMode !== 'httpProxy') {
            this.profile.options.httpProxyHost = undefined
            this.profile.options.httpProxyPort = undefined
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

    getConnectionDropdownTitle () {
        return {
            direct: 'Direct',
            proxyCommand: 'Proxy command',
            jumpHost: 'Jump host',
            socksProxy: 'SOCKS proxy',
            httpProxy: 'HTTP proxy',
        }[this.connectionMode]
    }
}
