import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { HotkeysService } from '../../tabby-core/src/services/hotkeys.service.ts'

// HotkeysService subscribes to hotkey$ in its constructor, whose filter queries
// the DOM on every emission. Nothing in these tests needs a real document.
Object.assign(globalThis, {
    document: {
        querySelectorAll: () => [],
        addEventListener: () => {},
    },
})

function makeService (): { service: any, fired: string[] } {
    const config = {
        ready$: { toPromise: () => ({ then: () => {} }) },
        store: { hotkeys: { 'split-bottom': ['Ctrl-Shift-S'] } },
        enabledServices: () => [],
    }
    const zone = { run: (fn: () => unknown) => fn() }
    const service = new (HotkeysService as any)(zone, config, [], { platform: 'Windows' })
    const fired: string[] = []
    service.unfilteredHotkey$.subscribe((hotkey: string) => fired.push(hotkey))
    return { service, fired }
}

let timestamp = 1000

function keyEvent (type: string, key: string, code: string, modifiers: Record<string, boolean>): any {
    return {
        type,
        key,
        code,
        keyCode: 0,
        ctrlKey: !!modifiers.ctrl,
        shiftKey: !!modifiers.shift,
        altKey: false,
        metaKey: false,
        repeat: false,
        timeStamp: timestamp++,
        preventDefault () {},
        stopPropagation () {},
        getModifierState () { return false },
    }
}

function chordDown (service: any): any[] {
    const events = [
        keyEvent('keydown', 'Control', 'ControlLeft', { ctrl: true }),
        keyEvent('keydown', 'Shift', 'ShiftLeft', { ctrl: true, shift: true }),
        keyEvent('keydown', 'S', 'KeyS', { ctrl: true, shift: true }),
    ]
    for (const event of events) {
        service.pushKeyEvent(event.type, event)
    }
    return events
}

describe('HotkeysService duplicate event forwarding', () => {
    it('emits once when the same keydown is forwarded again after another event', () => {
        const { service, fired } = makeService()
        const [, , sDown] = chordDown(service)
        assert.deepEqual(fired, ['split-bottom'])

        // The final key is released before its modifiers; its keyup is handled
        // first, then a delayed document listener re-forwards the keydown.
        service.pushKeyEvent('keyup', keyEvent('keyup', 'S', 'KeyS', { ctrl: true, shift: true }))
        service.pushKeyEvent('keydown', sDown)

        assert.deepEqual(fired, ['split-bottom'])
    })

    it('ignores a keydown whose native event is a keyup', () => {
        const { service, fired } = makeService()
        chordDown(service)
        assert.deepEqual(fired, ['split-bottom'])

        // xterm calls its custom key handler for keyup too; mislabelling that
        // event as a keydown used to match the chord a second time.
        const ghost = keyEvent('keyup', 'S', 'KeyS', { ctrl: true, shift: true })
        service.pushKeyEvent('keydown', ghost)

        assert.deepEqual(fired, ['split-bottom'])
    })

    it('still emits for each genuine press and release', () => {
        const { service, fired } = makeService()
        chordDown(service)
        service.pushKeyEvent('keyup', keyEvent('keyup', 'S', 'KeyS', { ctrl: true, shift: true }))
        service.pushKeyEvent('keyup', keyEvent('keyup', 'Shift', 'ShiftLeft', { ctrl: true }))
        service.pushKeyEvent('keyup', keyEvent('keyup', 'Control', 'ControlLeft', {}))
        chordDown(service)

        assert.deepEqual(fired, ['split-bottom', 'split-bottom'])
    })
})
