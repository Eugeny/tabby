/**
 * Output produced while a terminal's frontend is suspended (hidden tab).
 *
 * Keeping raw text here is much cheaper than feeding every PTY chunk into a full
 * xterm instance: xterm parses escape sequences, updates its buffer and schedules
 * a render for each write. The buffer is bounded so a long-running, chatty hidden
 * tab stays cheap, and the newest output is preserved so it can be replayed when
 * the tab is shown again.
 */
const MAX_SUSPENDED_OUTPUT = 1024 * 1024

/** Shown in place of output that was dropped because the buffer was full */
const DROPPED_MARKER = '\x1b[0m[... earlier output dropped ...]\r\n'

export class SuspendedOutputBuffer {
    private chunks: string[] = []
    private length = 0
    private truncated = false

    get empty (): boolean {
        return this.chunks.length === 0
    }

    /** The buffered output, including a marker if older output was dropped. */
    get value (): string {
        const data = this.chunks.join('')
        return this.truncated ? DROPPED_MARKER + data : data
    }

    push (data: string): void {
        if (!data.length) {
            return
        }
        this.chunks.push(data)
        this.length += data.length
        // PTY chunks start on UTF-8 boundaries, so dropping whole chunks from the
        // front can't split a character. Keep at least one chunk even if it alone
        // exceeds the limit - an oversized single write must still be replayed.
        while (this.length > MAX_SUSPENDED_OUTPUT && this.chunks.length > 1) {
            this.length -= this.chunks.shift()!.length
            this.truncated = true
        }
    }

    /** Returns the buffered output and clears the buffer. */
    drain (): string {
        const value = this.value
        this.chunks = []
        this.length = 0
        this.truncated = false
        return value
    }
}
