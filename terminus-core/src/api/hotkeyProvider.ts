export interface HotkeyDescription {
    id: string
    name: string
}

/**
 * Extend to provide your own hotkeys. A corresponding [[ConfigProvider]]
 * must also provide the `hotkeys.foo` config options with the default values
 */
export abstract class HotkeyProvider {
    hotkeys: HotkeyDescription[] = []

    abstract provide (): Promise<HotkeyDescription[]>
}
