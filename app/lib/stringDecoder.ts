// based on Joyent's StringDecoder
// https://github.com/nodejs/string_decoder/blob/master/lib/string_decoder.js

export class StringDecoder {
    lastNeed: number
    lastTotal: number
    lastChar: Buffer

    constructor () {
        this.lastNeed = 0
        this.lastTotal = 0
        this.lastChar = Buffer.allocUnsafe(4)
    }

    write (buf: Buffer): Buffer {
        if (buf.length === 0) {
            return buf
        }
        let r: Buffer|undefined = undefined
        let i = 0
        if (this.lastNeed) {
            r = this.fillLast(buf)
            if (r === undefined) {
                return Buffer.from('')
            }
            i = this.lastNeed
            this.lastNeed = 0
        }
        if (i < buf.length) {
            return r ? Buffer.concat([r, this.text(buf, i)]) : this.text(buf, i)
        }
        return r
    }

    // For UTF-8, a replacement character is added when ending on a partial
    // character.
    end (buf?: Buffer): Buffer {
        const r = buf?.length ? this.write(buf) : Buffer.from('')
        if (this.lastNeed) {
            console.log('end', r)
            return Buffer.concat([r, Buffer.from('\ufffd')])
        }
        return r
    }

    // Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
    // partial character, the character's bytes are buffered until the required
    // number of bytes are available.
    private text (buf: Buffer, i: number) {
        const total = this.utf8CheckIncomplete(buf, i)
        if (!this.lastNeed) {
            return buf.slice(i)
        }
        this.lastTotal = total
        const end = buf.length - (total - this.lastNeed)
        buf.copy(this.lastChar, 0, end)
        return buf.slice(i, end)
    }

    // Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
    private fillLast (buf: Buffer): Buffer|undefined {
        if (this.lastNeed <= buf.length) {
            buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed)
            return this.lastChar.slice(0, this.lastTotal)
        }
        buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length)
        this.lastNeed -= buf.length
        return undefined
    }

    // Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
    // continuation byte. If an invalid byte is detected, -2 is returned.
    private utf8CheckByte (byte) {
        if (byte <= 0x7F) {return 0} else if (byte >> 5 === 0x06) {return 2} else if (byte >> 4 === 0x0E) {return 3} else if (byte >> 3 === 0x1E) {return 4}
        return byte >> 6 === 0x02 ? -1 : -2
    }

    // Checks at most 3 bytes at the end of a Buffer in order to detect an
    // incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
    // needed to complete the UTF-8 character (if applicable) are returned.
    private utf8CheckIncomplete (buf, i) {
        let j = buf.length - 1
        if (j < i) {return 0}
        let nb = this.utf8CheckByte(buf[j])
        if (nb >= 0) {
            if (nb > 0) {this.lastNeed = nb - 1}
            return nb
        }
        if (--j < i || nb === -2) {return 0}
        nb = this.utf8CheckByte(buf[j])
        if (nb >= 0) {
            if (nb > 0) {this.lastNeed = nb - 2}
            return nb
        }
        if (--j < i || nb === -2) {return 0}
        nb = this.utf8CheckByte(buf[j])
        if (nb >= 0) {
            if (nb > 0) {
                if (nb === 2) {nb = 0} else {this.lastNeed = nb - 3}
            }
            return nb
        }
        return 0
    }
}
