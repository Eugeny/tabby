export const metaKeyName = {
    darwin: '⌘',
    win32: 'Win',
    linux: 'Super',
}[process.platform]

export const altKeyName = {
    darwin: '⌥',
    win32: 'Alt',
    linux: 'Alt',
}[process.platform]

export interface NativeKeyEvent {
    event?: string
    altKey: boolean
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    key: string
    keyCode: string
}

export function stringifyKeySequence (events: NativeKeyEvent[]): string[] {
    let items: string[] = []
    events = events.slice()

    while (events.length > 0) {
        let event = events.shift()
        if (event.event === 'keydown') {
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

            if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
                // TODO make this optional?
                continue
            }

            let key = (event as any).code
            key = key.replace('Key', '')
            key = key.replace('Arrow', '')
            key = key.replace('Digit', '')
            itemKeys.push(key)
            items.push(itemKeys.join('-'))
        }
    }
    return items
}
