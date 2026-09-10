/**
 * Bounds for the remote stdout/stderr capture cap (see
 * ETProfileOptions.bootstrapCaptureLimit). The lower bound keeps the IDPASSKEY
 * regex usable even with a pathological profile value; the upper bound keeps the
 * DoS protection meaningful (a hostile .bashrc cannot grow renderer memory beyond
 * this while we wait out the bootstrap timeout).
 */
export const DEFAULT_CAPTURE_BYTES = 64 * 1024
export const MIN_CAPTURE_BYTES = 1024
export const MAX_CAPTURE_BYTES = 16 * 1024 * 1024

/** Resolve the effective capture cap. Anything but a positive integer falls back to the default. */
export function getCaptureLimit (configured: number|null|undefined): number {
    if (typeof configured !== 'number' || !Number.isInteger(configured) || configured < MIN_CAPTURE_BYTES) {
        return DEFAULT_CAPTURE_BYTES
    }
    return Math.min(configured, MAX_CAPTURE_BYTES)
}
