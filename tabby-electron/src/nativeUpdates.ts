import { MonoTypeOperatorFunction, asyncScheduler, distinctUntilChanged, pipe, throttleTime } from 'rxjs'

/** Minimum time between two native updates driven by tab titles */
export const NATIVE_UPDATE_INTERVAL = 1000

/**
 * Rate-limits native UI updates driven by tab titles (window title, Touch Bar).
 *
 * Terminal apps animate their title (spinners at 10-30 Hz). Forwarding every frame made the
 * main process rebuild the Touch Bar and set the native window title each time; on macOS 26
 * the Touch Bar path gets more expensive the longer it runs, until the main thread saturates.
 * The first change applies immediately, then at most one per NATIVE_UPDATE_INTERVAL, always
 * ending on the latest value; unchanged values are skipped.
 */
export function throttleNativeUpdates<T> (compare?: (previous: T, current: T) => boolean): MonoTypeOperatorFunction<T> {
    return pipe(
        throttleTime(NATIVE_UPDATE_INTERVAL, asyncScheduler, { leading: true, trailing: true }),
        distinctUntilChanged(compare),
    )
}
