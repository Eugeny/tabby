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
    let lastEvent: NativeKeyEvent
    events = events.slice()

    while (events.length > 0) {
        let event = events.shift()
        if (event.event == 'keyup' && (lastEvent && lastEvent.event == 'keydown')) {
            let itemKeys: string[] = []
            if (lastEvent.ctrlKey) {
                itemKeys.push('Ctrl')
            }
            if (lastEvent.metaKey) {
                itemKeys.push(metaKeyName)
            }
            if (lastEvent.altKey) {
                itemKeys.push(altKeyName)
            }
            if (lastEvent.shiftKey) {
                itemKeys.push('Shift')
            }

            if (['Control', 'Shift', 'Alt', 'Command'].includes(lastEvent.key)) {
                // TODO make this optional?
                continue
            }
            itemKeys.push(lastEvent.key)
            items.push(itemKeys.join('+'))
        }
        lastEvent = event
    }
    return items
}
