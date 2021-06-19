/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { Observable } from 'rxjs'
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators'

import { ConfigService, PlatformService, FileProvidersService, Platform, HostAppService } from 'terminus-core'
import { PasswordStorageService } from '../services/passwordStorage.service'
import { SSHConnection, LoginScript, ForwardedPortConfig, SSHAlgorithmType, ALGORITHM_BLACKLIST } from '../api'
import { PromptModalComponent } from './promptModal.component'
import * as ALGORITHMS from 'ssh2/lib/protocol/constants'

/** @hidden */
@Component({
    template: require('./editConnectionModal.component.pug'),
})
export class EditConnectionModalComponent {
    Platform = Platform
    connection: SSHConnection
    hasSavedPassword: boolean
    useProxyCommand: boolean

    supportedAlgorithms: Record<string, string> = {}
    defaultAlgorithms: Record<string, string[]> = {}
    algorithms: Record<string, Record<string, boolean>> = {}

    private groupNames: string[]

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        private modalInstance: NgbActiveModal,
        private platform: PlatformService,
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

        this.groupNames = [...new Set(config.store.ssh.connections.map(x => x.group))] as string[]
        this.groupNames = this.groupNames.filter(x => x).sort()
    }

    groupTypeahead = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map(q => this.groupNames.filter(x => !q || x.toLowerCase().includes(q.toLowerCase())))
        )

    async ngOnInit () {
        this.hasSavedPassword = !!await this.passwordStorage.loadPassword(this.connection)
        this.connection.algorithms = this.connection.algorithms ?? {}
        this.connection.scripts = this.connection.scripts ?? []
        this.connection.auth = this.connection.auth ?? null
        this.connection.privateKeys ??= []

        this.useProxyCommand = !!this.connection.proxyCommand

        for (const k of Object.values(SSHAlgorithmType)) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!this.connection.algorithms[k]) {
                this.connection.algorithms[k] = this.defaultAlgorithms[k]
            }

            this.algorithms[k] = {}
            for (const alg of this.connection.algorithms[k]) {
                this.algorithms[k][alg] = true
            }
        }
    }

    async setPassword () {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = `Password for ${this.connection.user}@${this.connection.host}`
        modal.componentInstance.password = true
        try {
            const result = await modal.result
            if (result?.value) {
                this.passwordStorage.savePassword(this.connection, result.value)
                this.hasSavedPassword = true
            }
        } catch { }
    }

    clearSavedPassword () {
        this.hasSavedPassword = false
        this.passwordStorage.deletePassword(this.connection)
    }

    async addPrivateKey () {
        const ref = await this.fileProviders.selectAndStoreFile(`private key for ${this.connection.name}`)
        this.connection.privateKeys = [
            ...this.connection.privateKeys!,
            ref,
        ]
    }

    removePrivateKey (path: string) {
        this.connection.privateKeys = this.connection.privateKeys?.filter(x => x !== path)
    }

    save () {
        for (const k of Object.values(SSHAlgorithmType)) {
            this.connection.algorithms![k] = Object.entries(this.algorithms[k])
                .filter(([_, v]) => !!v)
                .map(([key, _]) => key)
        }
        if (!this.useProxyCommand) {
            this.connection.proxyCommand = undefined
        }
        this.modalInstance.close(this.connection)
    }

    cancel () {
        this.modalInstance.dismiss()
    }

    moveScriptUp (script: LoginScript) {
        if (!this.connection.scripts) {
            this.connection.scripts = []
        }
        const index = this.connection.scripts.indexOf(script)
        if (index > 0) {
            this.connection.scripts.splice(index, 1)
            this.connection.scripts.splice(index - 1, 0, script)
        }
    }

    moveScriptDown (script: LoginScript) {
        if (!this.connection.scripts) {
            this.connection.scripts = []
        }
        const index = this.connection.scripts.indexOf(script)
        if (index >= 0 && index < this.connection.scripts.length - 1) {
            this.connection.scripts.splice(index, 1)
            this.connection.scripts.splice(index + 1, 0, script)
        }
    }

    async deleteScript (script: LoginScript) {
        if (this.connection.scripts && (await this.platform.showMessageBox(
            {
                type: 'warning',
                message: 'Delete this script?',
                detail: script.expect,
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
            this.connection.scripts = this.connection.scripts.filter(x => x !== script)
        }
    }

    addScript () {
        if (!this.connection.scripts) {
            this.connection.scripts = []
        }
        this.connection.scripts.push({ expect: '', send: '' })
    }

    onForwardAdded (fw: ForwardedPortConfig) {
        this.connection.forwardedPorts = this.connection.forwardedPorts ?? []
        this.connection.forwardedPorts.push(fw)
    }

    onForwardRemoved (fw: ForwardedPortConfig) {
        this.connection.forwardedPorts = this.connection.forwardedPorts?.filter(x => x !== fw)
    }
}
