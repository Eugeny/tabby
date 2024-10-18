import { Injectable, InjectFlags, Injector } from '@angular/core'
import { NewTabParameters, PartialProfile, TranslateService, QuickConnectProfileProvider } from 'tabby-core'
import { SSHProfileSettingsComponent } from './components/sshProfileSettings.component'
import { SSHTabComponent } from './components/sshTab.component'
import { PasswordStorageService } from './services/passwordStorage.service'
import { SSHAlgorithmType, SSHProfile } from './api'
import { SSHProfileImporter } from './api/importer'
import { defaultAlgorithms } from './algorithms'

@Injectable({ providedIn: 'root' })
export class SSHProfilesService extends QuickConnectProfileProvider<SSHProfile> {
    id = 'ssh'
    name = 'SSH'
    settingsComponent = SSHProfileSettingsComponent
    configDefaults = {
        options: {
            host: null,
            port: 22,
            user: 'root',
            auth: null,
            password: null,
            privateKeys: [],
            keepaliveInterval: 5000,
            keepaliveCountMax: 10,
            readyTimeout: null,
            x11: false,
            skipBanner: false,
            jumpHost: null,
            agentForward: false,
            warnOnClose: null,
            algorithms: {
                hmac: [] as string[],
                kex: [] as string[],
                cipher: [] as string[],
                serverHostKey: [] as string[],
            },
            proxyCommand: null,
            forwardedPorts: [],
            scripts: [],
            socksProxyHost: null,
            socksProxyPort: null,
            httpProxyHost: null,
            httpProxyPort: null,
            reuseSession: true,
            input: { backspace: 'backspace' },
        },
        clearServiceMessagesOnConnect: true,
    }

    constructor (
        private passwordStorage: PasswordStorageService,
        private translate: TranslateService,
        private injector: Injector,
    ) {
        super()
        for (const k of Object.values(SSHAlgorithmType)) {
            this.configDefaults.options.algorithms[k] = [...defaultAlgorithms[k]]
            this.configDefaults.options.algorithms[k].sort()
        }
    }

    async getBuiltinProfiles (): Promise<PartialProfile<SSHProfile>[]> {
        const importers = this.injector.get<SSHProfileImporter[]>(SSHProfileImporter as any, [], InjectFlags.Optional)
        let imported: PartialProfile<SSHProfile>[] = []
        for (const importer of importers) {
            try {
                imported = imported.concat(await importer.getProfiles())
            } catch (e) {
                console.warn('Could not import SSH profiles:', e)
            }
        }
        return [
            {
                id: `ssh:template`,
                type: 'ssh',
                name: this.translate.instant('SSH connection'),
                icon: 'fas fa-desktop',
                options: {
                    host: '',
                    port: 22,
                    user: 'root',
                },
                isBuiltin: true,
                isTemplate: true,
                weight: -1,
            },
            ...imported.map(p => ({
                ...p,
                isBuiltin: true,
            })),
        ]
    }

    async getNewTabParameters (profile: SSHProfile): Promise<NewTabParameters<SSHTabComponent>> {
        return {
            type: SSHTabComponent,
            inputs: { profile },
        }
    }

    getSuggestedName (profile: SSHProfile): string {
        return `${profile.options.user}@${profile.options.host}:${profile.options.port}`
    }

    getDescription (profile: PartialProfile<SSHProfile>): string {
        return profile.options?.host ?? ''
    }

    deleteProfile (profile: SSHProfile): void {
        this.passwordStorage.deletePassword(profile)
    }

    quickConnect (query: string): PartialProfile<SSHProfile> {
        let user: string|undefined = undefined
        let host = query
        let port = 22
        if (host.includes('@')) {
            const parts = host.split(/@/g)
            host = parts[parts.length - 1]
            user = parts.slice(0, parts.length - 1).join('@')
        }
        if (host.includes('[')) {
            port = parseInt(host.split(']')[1].substring(1))
            host = host.split(']')[0].substring(1)
        } else if (host.includes(':')) {
            port = parseInt(host.split(/:/g)[1])
            host = host.split(':')[0]
        }

        return {
            name: query,
            type: 'ssh',
            options: {
                host,
                user,
                port,
            },
        }
    }

    intoQuickConnectString (profile: SSHProfile): string|null {
        let s = profile.options.host
        if (profile.options.user !== 'root') {
            s = `${profile.options.user}@${s}`
        }
        if (profile.options.port !== 22) {
            s = `${s}:${profile.options.port}`
        }
        return s
    }
}
