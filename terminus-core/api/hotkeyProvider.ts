export interface IHotkeyDescription {
    id: string,
    name: string,
}

export abstract class HotkeyProvider {
    hotkeys: IHotkeyDescription[] = []
}
