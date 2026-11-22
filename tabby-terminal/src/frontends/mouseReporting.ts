/**
 * Mouse tracking modes as reported by xterm.js `Terminal.modes`.
 * `none` means the running application has not requested mouse reporting.
 */
export type MouseTrackingMode = 'none' | 'x10' | 'vt200' | 'drag' | 'any'

export interface MouseButtonEvent {
    type: string
    which: number
    ctrlKey: boolean
}

/**
 * Right button, or Ctrl+left button on platforms where that acts as right-click.
 */
export function isRightButtonEvent (event: MouseButtonEvent): boolean {
    return event.which === 3 || event.which === 1 && event.ctrlKey
}

/**
 * Whether a mouse event should be left entirely to xterm.js so that the
 * running application receives it, instead of being consumed by Tabby's own
 * context-menu / right-click-paste handling.
 *
 * While mouse reporting is active xterm.js sends the button press from its
 * own element, but registers the matching release on `document`. Calling
 * preventDefault()/stopPropagation() on the terminal host (which is an
 * ancestor of xterm's element and a descendant of `document`) would stop the
 * release before xterm sees it, leaving the application with a stuck button
 * while Tabby opens a second, native menu.
 */
export function shouldDeferRightClickToApplication (
    mouseTrackingMode: MouseTrackingMode,
    event: MouseButtonEvent,
): boolean {
    return mouseTrackingMode !== 'none' && isRightButtonEvent(event)
}
