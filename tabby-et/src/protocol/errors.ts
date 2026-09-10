/**
 * A failure that reconnecting cannot fix.
 *
 * Two things raise it:
 *
 * - `BackedWriter.recover` when the replay range the peer asked for is gone (or
 *   never existed), so every future recovery would fail identically.
 * - `ETCrypto.decrypt` when a packet fails its Poly1305 check. That is either
 *   tampering or a protocol desync; both mean the encrypted stream can no longer
 *   be trusted, and neither is repaired by opening a new socket.
 *
 * The connection layer ends the session on this instead of looping forever.
 */
export class UnrecoverableSessionError extends Error {}
