import { PartialProfile, Profile } from './profileProvider'

export interface HotkeyDescription {
    id: string
    name: string
}

export interface Hotkey {
    strokes: string[] | string; // may be a sequence of strokes
    isDuplicate: boolean;
}

/**
 * Extend to provide your own hotkeys. A corresponding [[ConfigProvider]]
 * must also provide the `hotkeys.foo` config options with the default values
 */
export abstract class HotkeyProvider {
    abstract provide (): Promise<HotkeyDescription[]>

    static getProfileHotkeyName (profile: PartialProfile<Profile>): string {
        return (profile.id ?? profile.name).replace(/\./g, '-')
    }
}
