import slugify from 'slugify'
import { v4 as uuidv4 } from 'uuid'
import { Injectable } from '@angular/core'
import { ConfigService, NewTabParameters, PartialProfile, Profile, ProfileProvider } from './api'
import { SplitTabComponent, SplitTabRecoveryProvider } from './components/splitTab.component'

export interface SplitLayoutProfileOptions {
    recoveryToken: any
}

export interface SplitLayoutProfile extends Profile {
    options: SplitLayoutProfileOptions
}

@Injectable({ providedIn: 'root' })
export class SplitLayoutProfilesService extends ProfileProvider<SplitLayoutProfile> {
    id = 'split-layout'
    name = 'Saved layout'
    configDefaults = {
        options: {
            recoveryToken: null,
        },
    }

    constructor (
        private splitTabRecoveryProvider: SplitTabRecoveryProvider,
        private config: ConfigService,
    ) {
        super()
    }

    async getBuiltinProfiles (): Promise<PartialProfile<SplitLayoutProfile>[]> {
        return []
    }

    async getNewTabParameters (profile: SplitLayoutProfile): Promise<NewTabParameters<SplitTabComponent>> {
        return this.splitTabRecoveryProvider.recover(profile.options.recoveryToken)
    }

    getDescription (_: SplitLayoutProfile): string {
        return ''
    }

    async createProfile (tab: SplitTabComponent, name: string): Promise<void> {
        const token = await tab.getRecoveryToken()
        const profile: PartialProfile<SplitLayoutProfile> = {
            id: `${this.id}:custom:${slugify(name)}:${uuidv4()}`,
            type: this.id,
            name,
            options: {
                recoveryToken: token,
            },
        }
        this.config.store.profiles.push(profile)
        await this.config.save()
    }
}
