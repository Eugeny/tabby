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

export interface EventData {
    ctrlKey: boolean
    metaKey: boolean
    altKey: boolean
    shiftKey: boolean
    key: string
    code: string
    eventName: string
    time: number
}

const REGEX_LATIN_KEYNAME = /^[A-Za-z]$/

export function stringifyKeySequence (events: EventData[]): string[] {
    const items: string[] = []
    events = events.slice()

    while (events.length > 0) {
        const event = events.shift()!
        if (event.eventName === 'keydown') {
            const itemKeys: string[] = []
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

            let key = event.code
            if (REGEX_LATIN_KEYNAME.test(event.key)) {
                // Handle Dvorak etc via the reported "character" instead of the scancode
                key = event.key.toUpperCase()
            } else {
                key = key.replace('Key', '')
                key = key.replace('Arrow', '')
                key = key.replace('Digit', '')
                key = {
                    Comma: ',',
                    Period: '.',
                    Slash: '/',
                    Backslash: '\\',
                    IntlBackslash: '`',
                    Backquote: '~', // Electron says it's the tilde
                    Minus: '-',
                    Equal: '=',
                    Semicolon: ';',
                    Quote: '\'',
                    BracketLeft: '[',
                    BracketRight: ']',
                }[key] ?? key
            }

            itemKeys.push(key)
            items.push(itemKeys.join('-'))
        }
    }
    return items
}
