import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { Subject } from 'rxjs'
import { ipcRenderer } from 'electron'
import { TouchbarService } from '../src/services/touchbar.service.ts'

// Every `window-set-touch-bar` message makes the main process rebuild the native Touch Bar
// control, which gets slower each time on macOS 26 - so the renderer must not send many.

class FakeTab {
    hasActivity = false
    titleChange$ = new Subject<string>()
    activity$ = new Subject<boolean>()

    constructor (public title: string) { }

    setTitle (title: string): void {
        this.title = title
        this.titleChange$.next(title)
    }
}

function setUp (hacks: Record<string, any> = {}) {
    const app = {
        tabs: [] as FakeTab[],
        activeTab: null as FakeTab|null,
        tabsChanged$: new Subject<void>(),
        activeTabChange$: new Subject<void>(),
        tabOpened$: new Subject<FakeTab>(),
    }
    const hostApp = { platform: 'macOS' }
    const config = { store: { hacks } }
    const zone = { run: (fn: () => void) => fn() }
    new (TouchbarService as any)(app, hostApp, config, zone)

    for (const title of ['one', 'two', 'three']) {
        const tab = new FakeTab(title)
        app.tabs.push(tab)
        app.tabOpened$.next(tab)
    }
    app.activeTab = app.tabs[0]
    app.tabsChanged$.next()
    return app
}

function touchBarUpdates (): any[][] {
    return (ipcRenderer as any).sent.filter(([channel]) => channel === 'window-set-touch-bar')
}

describe('TouchbarService', () => {
    beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
        ;(ipcRenderer as any).sent = []
    })

    afterEach(() => {
        mock.timers.reset()
    })

    it('sends at most one Touch Bar update a second while a tab title changes', () => {
        const app = setUp()
        mock.timers.tick(5000)
        ;(ipcRenderer as any).sent = []

        // A shell or tmux updating the title 20 times a second for 2.5 seconds.
        for (let i = 0; i < 50; i++) {
            app.activeTab!.setTitle(`title ${i}`)
            mock.timers.tick(50)
        }
        mock.timers.tick(1000)

        const updates = touchBarUpdates()
        assert.ok(updates.length <= 4, `${updates.length} Touch Bar updates in 3.5 seconds, each one rebuilding the native control`)
        assert.equal(updates.at(-1)![1][0].label, 'title 49', 'the last title must still reach the Touch Bar')
    })

    it('sends a change at once after a quiet period', () => {
        const app = setUp()
        mock.timers.tick(5000)
        ;(ipcRenderer as any).sent = []

        app.activeTab = app.tabs[1]
        app.activeTabChange$.next()

        const updates = touchBarUpdates()
        assert.equal(updates.length, 1)
        assert.equal(updates[0][2], 1)
    })

    it('sends nothing when hacks.disableTouchBar is set', () => {
        const app = setUp({ disableTouchBar: true })
        for (let i = 0; i < 10; i++) {
            app.activeTab!.setTitle(`title ${i}`)
            mock.timers.tick(500)
        }
        mock.timers.tick(1000)

        assert.equal(touchBarUpdates().length, 0)
    })
})
