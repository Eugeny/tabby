/**
 * Recovery budget for the WebGL renderer: how many times to recreate the
 * renderer after a lost GPU context before giving up and letting xterm fall
 * back to its DOM renderer.
 *
 * Attempts only count toward the budget within a sliding time window, so
 * isolated context losses (sleep/wake, driver reset, backgrounded app) that
 * happen days apart never permanently downgrade a pane to the DOM renderer.
 */
export const MAX_WEBGL_RECOVERY_ATTEMPTS = 3
export const WEBGL_RECOVERY_WINDOW_MS = 10 * 60 * 1000

export class WebGLRecoveryBudget {
    private attemptTimestamps: number[] = []

    constructor (
        private maxAttempts = MAX_WEBGL_RECOVERY_ATTEMPTS,
        private windowMs = WEBGL_RECOVERY_WINDOW_MS,
        private now: () => number = Date.now,
    ) { }

    /**
     * Whether another recovery attempt is allowed right now.
     * Records the attempt when it returns true.
     */
    trySpend (): boolean {
        this.prune()
        if (this.attemptTimestamps.length >= this.maxAttempts) {
            return false
        }
        this.attemptTimestamps.push(this.now())
        return true
    }

    /** Drop attempts that have aged out of the window, re-arming the budget. */
    expireOldAttempts (): void {
        this.prune()
    }

    private prune (): void {
        const cutoff = this.now() - this.windowMs
        this.attemptTimestamps = this.attemptTimestamps.filter(t => t > cutoff)
    }
}
