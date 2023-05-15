import { UTF8Splitter } from 'tabby-core'

import { SessionMiddleware } from '../api/middleware'

/**
 * Ensures that the session output is chunked at UTF8 character boundaries.
 */
export class UTF8SplitterMiddleware extends SessionMiddleware {
    private decoder = new UTF8Splitter()

    feedFromSession (data: Buffer): void {
        super.feedFromSession(this.decoder.write(data))
    }

    close (): void {
        const remainder = this.decoder.flush()
        if (remainder.length) {
            super.feedFromSession(remainder)
        }
        super.close()
    }
}
