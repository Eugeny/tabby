/* eslint-disable @typescript-eslint/no-type-alias */
/**
 * Minimal protobuf wire-format codec.
 *
 * Why not protobufjs: ET uses 12 tiny proto2 messages and we need explicit control
 * over FIELD PRESENCE. ET tests fields with has_xxx(), so emitting `closed = false`
 * instead of omitting the field changes the meaning of the message.
 *
 * Rule for this file: a value of `undefined` or `null` means "field absent" and
 * nothing is written. `false` and `0` are real values and ARE written.
 */

export const WIRE_VARINT = 0
export const WIRE_FIXED64 = 1
export const WIRE_LEN = 2
export const WIRE_FIXED32 = 5

export class ProtoWriter {
    private chunks: Buffer[] = []
    private size = 0

    private push (buf: Buffer): void {
        this.chunks.push(buf)
        this.size += buf.length
    }

    varint (value: number): this {
        if (value < 0) {
            // proto2 sign-extends negative int32 to a 10-byte varint.
            let v = BigInt.asUintN(64, BigInt(value))
            const bytes: number[] = []
            do {
                let byte = Number(v & BigInt(0x7f))
                v >>= BigInt(7)
                if (v) {
                    byte |= 0x80
                }
                bytes.push(byte)
            } while (v)
            this.push(Buffer.from(bytes))
            return this
        }
        const bytes: number[] = []
        let v = value
        do {
            // NOTE: modulo/division, not bitwise ops - JS bitwise truncates to int32
            // and TERMINAL_BUFFER lengths can exceed that in pathological cases.
            let byte = v % 128
            v = Math.floor(v / 128)
            if (v) {
                byte |= 0x80
            }
            bytes.push(byte)
        } while (v)
        this.push(Buffer.from(bytes))
        return this
    }

    tag (field: number, wireType: number): this {
        return this.varint(field * 8 + wireType)
    }

    int32 (field: number, value?: number|null): this {
        if (value === undefined || value === null) {
            return this
        }
        return this.tag(field, WIRE_VARINT).varint(value)
    }

    bool (field: number, value?: boolean|null): this {
        if (value === undefined || value === null) {
            return this
        }
        return this.tag(field, WIRE_VARINT).varint(value ? 1 : 0)
    }

    bytes (field: number, value?: Buffer|null): this {
        if (value === undefined || value === null) {
            return this
        }
        this.tag(field, WIRE_LEN).varint(value.length)
        this.push(value)
        return this
    }

    string (field: number, value?: string|null): this {
        if (value === undefined || value === null) {
            return this
        }
        return this.bytes(field, Buffer.from(value, 'utf8'))
    }

    /** Embed an already-serialized sub-message. */
    message (field: number, value?: Buffer|null): this {
        return this.bytes(field, value)
    }

    finish (): Buffer {
        return Buffer.concat(this.chunks, this.size)
    }
}

export interface DecodedField {
    wireType: number
    varint?: number|bigint
    bytes?: Buffer
}

export type DecodedMessage = Map<number, DecodedField[]>

/**
 * Decode a varint exactly.
 *
 * Values that fit Number's safe range take the fast path. Larger values are only
 * ever legitimate for sign-extended negative int32s (10-byte varints); those are
 * returned as exact BigInts rather than precision-losing floats. More than 10
 * bytes, or a value wider than 64 bits, is malformed input and is rejected.
 */
function readVarint (buf: Buffer, offset: number): [number|bigint, number] {
    const digits: number[] = []
    let len = 0
    for (;;) {
        if (offset + len >= buf.length) {
            throw new Error('Truncated protobuf varint')
        }
        const byte = buf[offset + len]
        digits.push(byte & 0x7f)
        len++
        if (!(byte & 0x80)) {
            break
        }
        if (len >= 10) {
            throw new Error('Protobuf varint too long')
        }
    }
    let result = 0
    let scale = 1
    for (const d of digits) {
        result += d * scale
        scale *= 128
    }
    if (result <= Number.MAX_SAFE_INTEGER) {
        return [result, len]
    }
    let big = BigInt(0)
    for (let i = digits.length - 1; i >= 0; i--) {
        big = big << BigInt(7) | BigInt(digits[i])
    }
    if (big > BigInt('0xffffffffffffffff')) {
        throw new Error('Protobuf varint too long')
    }
    return [big, len]
}

/**
 * Decode a message into field number -> occurrences.
 * Unknown fields are retained (harmless) rather than rejected, matching protobuf rules.
 */
export function decodeFields (buf: Buffer): DecodedMessage {
    const out: DecodedMessage = new Map()
    const add = (field: number, value: DecodedField) => {
        const list = out.get(field)
        if (list) {
            list.push(value)
        } else {
            out.set(field, [value])
        }
    }
    let offset = 0
    while (offset < buf.length) {
        const [tagValue, tagLen] = readVarint(buf, offset)
        offset += tagLen
        // Tags are 32-bit on the wire (29-bit field number + 3-bit wire type).
        // Anything wider is malformed, and converting it to Number would lose
        // the wire-type bits to float precision.
        if (typeof tagValue === 'bigint' || tagValue > 0xFFFFFFFF) {
            throw new Error('Malformed protobuf tag')
        }
        const tag = tagValue
        const field = Math.floor(tag / 8)
        const wireType = tag % 8
        if (wireType === WIRE_VARINT) {
            const [value, len] = readVarint(buf, offset)
            offset += len
            add(field, { wireType, varint: value })
        } else if (wireType === WIRE_LEN) {
            const [lenValue, lenLen] = readVarint(buf, offset)
            offset += lenLen
            // Field lengths are int32 on the wire; wider values are malformed.
            if (typeof lenValue === 'bigint') {
                throw new Error('Malformed protobuf field length')
            }
            const len = lenValue
            if (offset + len > buf.length) {
                throw new Error('Truncated protobuf length-delimited field')
            }
            add(field, { wireType, bytes: buf.subarray(offset, offset + len) })
            offset += len
        } else if (wireType === WIRE_FIXED64) {
            if (offset + 8 > buf.length) {
                throw new Error('Truncated protobuf fixed64 field')
            }
            add(field, { wireType, bytes: buf.subarray(offset, offset + 8) })
            offset += 8
        } else if (wireType === WIRE_FIXED32) {
            add(field, { wireType, bytes: buf.subarray(offset, offset + 4) })
            if (offset + 4 > buf.length) {
                throw new Error('Truncated protobuf fixed32 field')
            }
            offset += 4
        } else {
            throw new Error(`Unsupported protobuf wire type ${wireType}`)
        }
    }
    return out
}

export function has (m: DecodedMessage, field: number): boolean {
    return m.has(field)
}

export function getVarint (m: DecodedMessage, field: number): number|bigint|undefined {
    return m.get(field)?.[0]?.varint
}

/**
 * Read an int32 field. Handles sign-extended negative values exactly: on the wire
 * proto2 encodes -1 as a 10-byte varint of 2^64-1, which the fast decoder returns
 * as a BigInt.
 */
export function getInt32 (m: DecodedMessage, field: number): number|undefined {
    const v = getVarint(m, field)
    if (v === undefined) {
        return undefined
    }
    if (typeof v === 'bigint') {
        return Number(BigInt.asIntN(32, v))
    }
    return v | 0
}

export function getBool (m: DecodedMessage, field: number): boolean|undefined {
    const v = getVarint(m, field)
    return v === undefined ? undefined : v !== 0
}

export function getBytes (m: DecodedMessage, field: number): Buffer|undefined {
    return m.get(field)?.[0]?.bytes
}

export function getString (m: DecodedMessage, field: number): string|undefined {
    return getBytes(m, field)?.toString('utf8')
}

export function getRepeatedBytes (m: DecodedMessage, field: number): Buffer[] {
    return (m.get(field) ?? []).map(x => x.bytes).filter((x): x is Buffer => x !== undefined)
}
