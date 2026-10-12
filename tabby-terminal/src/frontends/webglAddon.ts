import type { WebglAddon } from '@xterm/addon-webgl'

/**
 * Disposes a WebGL addon without leaking its renderer.
 *
 * @xterm/addon-webgl <= 0.19 never disposes WebglRenderer._cursorBlinkStateManager (it is not
 * registered for disposal), so its 600ms blink interval keeps the disposed renderer - and
 * through it the whole Terminal, its scrollback and the frontend - alive forever. Dispose it
 * explicitly first. Fixed upstream in addon-webgl 0.20 (xtermjs/xterm.js#5817); drop this then.
 */
export function disposeWebglAddon (addon: WebglAddon|undefined): void {
    try {
        (addon as any)?._renderer?._cursorBlinkStateManager?.dispose()
    } catch { }
    addon?.dispose()
}
