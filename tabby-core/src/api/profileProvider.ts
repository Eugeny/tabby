/* eslint-disable @typescript-eslint/no-type-alias */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { BaseTabComponent } from '../components/baseTab.component'
import { NewTabParameters } from '../services/tabs.service'

export interface Profile {
    id: string
    type: string
    name: string
    group?: string
    options: any

    icon?: string
    color?: string
    disableDynamicTitle: boolean

    weight: number
    isBuiltin: boolean
    isTemplate: boolean
}

export type PartialProfile<T extends Profile> = Omit<Omit<Omit<{
    [K in keyof T]?: T[K]
}, 'options'>, 'type'>, 'name'> & {
    type: string
    name: string
    options?: {
        [K in keyof T['options']]?: T['options'][K]
    }
}

export interface ProfileSettingsComponent<P extends Profile> {
    profile: P
    save?: () => void
}

export abstract class ProfileProvider<P extends Profile> {
    id: string
    name: string
    supportsQuickConnect = false
    settingsComponent?: new (...args: any[]) => ProfileSettingsComponent<P>
    configDefaults = {}

    abstract getBuiltinProfiles (): Promise<PartialProfile<P>[]>

    abstract getNewTabParameters (profile: P): Promise<NewTabParameters<BaseTabComponent>>

    getSuggestedName (profile: PartialProfile<P>): string|null {
        return null
    }

    abstract getDescription (profile: PartialProfile<P>): string

    quickConnect (query: string): PartialProfile<P>|null {
        return null
    }

    deleteProfile (profile: P): void { }
}
