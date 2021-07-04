/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { BaseTabComponent } from '../components/baseTab.component'
import { NewTabParameters } from '../services/tabs.service'

export interface Profile {
    id?: string
    type: string
    name: string
    group?: string
    options?: Record<string, any>

    icon?: string
    color?: string
    disableDynamicTitle?: boolean

    weight?: number
    isBuiltin?: boolean
    isTemplate?: boolean
}

export interface ProfileSettingsComponent {
    profile: Profile
    save?: () => void
}

export abstract class ProfileProvider {
    id: string
    name: string
    supportsQuickConnect = false
    settingsComponent: new (...args: any[]) => ProfileSettingsComponent

    abstract getBuiltinProfiles (): Promise<Profile[]>

    abstract getNewTabParameters (profile: Profile): Promise<NewTabParameters<BaseTabComponent>>

    abstract getDescription (profile: Profile): string

    quickConnect (query: string): Profile|null {
        return null
    }

    deleteProfile (profile: Profile): void { }
}
