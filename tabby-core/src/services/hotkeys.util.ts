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

export interface KeyEventData {
    ctrlKey?: boolean
    metaKey?: boolean
    altKey?: boolean
    shiftKey?: boolean
    key: string
    code: string
    eventName: string
    time: number
    registrationTime: number
}

const REGEX_LATIN_KEYNAME = /^[A-Za-z]$/

export interface KeySequenceItem {
    value: string
    firstEvent: KeyEventData
    lastEvent: KeyEventData
}

export function stringifyKeySequence (events: KeyEventData[]): KeySequenceItem[] {
    const items: KeySequenceItem[] = []
    let pressedKeys: KeySequenceItem[] = []
    events = events.slice()

    const strictOrdering = ['Ctrl', metaKeyName, altKeyName, 'Shift']

    function flushPressedKeys () {
        if (pressedKeys.length) {
            const v = {
                firstEvent: pressedKeys[0].firstEvent,
                lastEvent: pressedKeys[pressedKeys.length - 1].lastEvent,
            }
            pressedKeys = [
                ...strictOrdering.map(x => pressedKeys.find(p => p.value === x)).filter(x => !!x) as KeySequenceItem[],
                ...pressedKeys.filter(p => !strictOrdering.includes(p.value)),
            ]
            items.push({
                value: pressedKeys.map(x => x.value).join('-'),
                ...v,
            })
            pressedKeys = []
        }
    }

    while (events.length > 0) {
        const event = events.shift()!

        // eslint-disable-next-line @typescript-eslint/init-declarations
        let key: string
        if (event.key === 'Control') {
            key = 'Ctrl'
        } else if (event.key === 'Meta') {
            key = metaKeyName
        } else if (event.key === 'Alt') {
            key = altKeyName
        } else if (event.key === 'Shift') {
            key = 'Shift'
        } else {
            key = event.code
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
        }

        if (event.eventName === 'keydown') {
            pressedKeys.push({
                value: key,
                firstEvent: event,
                lastEvent: event,
            })
        }
        if (event.eventName === 'keyup') {
            flushPressedKeys()
        }
    }

    flushPressedKeys()
    return items
}
