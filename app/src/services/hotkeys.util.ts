import * as os from 'os'


export const metaKeyName = {
    darwin: '⌘',
    win32: 'Win',
    linux: 'Super',
}[os.platform()]

export const altKeyName = {
    darwin: 'Option',
    win32: 'Alt',
    linux: 'Alt',
}[os.platform()]


export interface NativeKeyEvent {
    event?: string,
    altKey: boolean,
    ctrlKey: boolean,
    metaKey: boolean,
    shiftKey: boolean,
    key: string,
    keyCode: string,
}


export function stringifyKeySequence(events: NativeKeyEvent[]): string[] {
    let items: string[] = []
    events = events.slice()

    while (events.length > 0) {
        let event = events.shift()
        if (event.event == 'keydown') {
            let itemKeys: string[] = []
            if (event.ctrlKey) {
                itemKeys.push('Ctrl')
            }
            if (event.metaKey) {
                itemKeys.push(metaKeyName)
            }
            if (event.altKey) {
                itemKeys.push(altKeyName)
            }
            if (event.shiftKey) {
                itemKeys.push('Shift')
            }

            if (['Control', 'Shift', 'Alt', 'Command'].includes(event.key)) {
                // TODO make this optional?
                continue
            }
            itemKeys.push(event.key)
            items.push(itemKeys.join('-'))
        }
    }
    return items
}
