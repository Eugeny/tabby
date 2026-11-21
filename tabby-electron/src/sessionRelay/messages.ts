/**
 * Messages exchanged over the MessagePort between the window that runs a
 * terminal session ("host") and the window that displays it ("guest")
 */

/** Sent by the host */
export type RelayHostMessage =
    | { type: 'output', data: string }
    /** Output is now being held back (in reply to `pause`) */
    | { type: 'paused' }
    /** The tab has been closed in the host window */
    | { type: 'closed' }

/** Sent by the guest */
export type RelayGuestMessage =
    | { type: 'input', data: Uint8Array }
    | { type: 'resize', columns: number, rows: number }
    /** Hold back output while the tab moves on to yet another window */
    | { type: 'pause' }
    | { type: 'resume' }
    /** The user has closed the tab */
    | { type: 'close' }
