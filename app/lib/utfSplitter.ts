const partials = [
    [0b110, 5, 0],
    [0b1110, 4, 1],
    [0b11110, 3, 2],
]

export class UTF8Splitter {
    private internal = Buffer.alloc(0)

    write (data: Buffer): Buffer {
        this.internal = Buffer.concat([this.internal, data])

        let keep = 0
        for (const [pattern, shift, maxOffset] of partials) {
            for (let offset = 0; offset < maxOffset + 1; offset++) {
                if (this.internal[this.internal.length - offset - 1] >> shift === pattern) {
                    keep = Math.max(keep, offset + 1)
                }
            }
        }

        const result = this.internal.slice(0, this.internal.length - keep)
        this.internal = this.internal.slice(this.internal.length - keep)
        return result
    }

    flush (): Buffer {
        const result = this.internal
        this.internal = Buffer.alloc(0)
        return result
    }
}
