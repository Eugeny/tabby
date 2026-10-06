import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Observable, interval, map, of, take } from 'rxjs'
import { TestScheduler } from 'rxjs/testing'
import { NATIVE_UPDATE_INTERVAL, throttleNativeUpdates } from '../src/nativeUpdates.ts'

/** Runs `source` through the operator on virtual time; returns [time, value] per native update */
function nativeUpdates<T> (source: () => Observable<T>, compare?: (a: T, b: T) => boolean): [number, T][] {
    const scheduler = new TestScheduler(assert.deepEqual)
    const updates: [number, T][] = []
    scheduler.run(() => {
        source().pipe(throttleNativeUpdates(compare)).subscribe(value => updates.push([scheduler.now(), value]))
    })
    return updates
}

/** A title spinner: `fps` frames per second for `seconds` */
const spinner = (fps: number, seconds: number) => () => interval(Math.round(1000 / fps)).pipe(
    take(fps * seconds),
    map(i => `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`[i % 10] + ` agent working - step ${i}`),
)

describe('throttleNativeUpdates', () => {
    it('turns one second of a 30 Hz title spinner into two native updates', () => {
        const updates = nativeUpdates(spinner(30, 1))
        assert.deepEqual(updates.map(([, title]) => title), ['⠋ agent working - step 0', '⠏ agent working - step 29'])
    })

    it('applies at most one update per interval and ends on the latest title', () => {
        const updates = nativeUpdates(spinner(30, 10))
        assert.ok(updates.length <= 11, `${updates.length} native updates in 10 s`)
        for (let i = 1; i < updates.length; i++) {
            assert.ok(updates[i][0] - updates[i - 1][0] >= NATIVE_UPDATE_INTERVAL, 'two native updates less than an interval apart')
        }
        assert.equal(updates.at(-1)![1], '⠏ agent working - step 299')
    })

    it('applies a single change immediately', () => {
        assert.deepEqual(nativeUpdates(() => of('vim README.md')), [[0, 'vim README.md']])
    })

    it('skips unchanged values', () => {
        const updates = nativeUpdates(() => interval(10).pipe(take(300), map(() => 'Tabby')))
        assert.deepEqual(updates.map(([, title]) => title), ['Tabby'])
    })

    it('compares structured state with the given comparator', () => {
        const state = () => [{ label: 'zsh', hasActivity: false }]
        const updates = nativeUpdates(() => interval(10).pipe(take(300), map(state)), (a, b) => JSON.stringify(a) === JSON.stringify(b))
        assert.equal(updates.length, 1)
    })
})
