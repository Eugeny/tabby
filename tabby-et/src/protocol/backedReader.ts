import { ByteReader } from './byteReader'
import { ETCrypto } from './crypto'
import { MAX_PROTO_LENGTH, PACKET_HEADER_SIZE } from './constants'

export interface ETPacket {
    header: number
    payload: Buffer
}

export class BackedReader {
    /** Number of packets received, including those handed to us by revive(). */
    sequenceNumber = 0

    /** Packets recovered during reconnect, still encrypted, oldest first. */
    private localBuffer: Buffer[] = []
    private reader: ByteReader|null = null

    constructor (private crypto: ETCrypto) {}

    attach (reader: ByteReader): void {
        this.reader = reader
    }

    /**
     * Queue recovered packets and account for them immediately.
     *
     * ET does `sequenceNumber += newLocalEntries.size()` inside revive(), BEFORE the
     * entries are decrypted. We must do the same: if a second disconnect happens while
     * the queue is still draining, our SequenceHeader has to claim we already have them,
     * or the server replays them a second time and the nonce counters desynchronise.
     */
    revive (reader: ByteReader, recovered: Buffer[]): void {
        this.reader = reader
        this.localBuffer.push(...recovered)
        this.sequenceNumber += recovered.length
    }

    /** Read one packet: recovery queue first, then the socket. */
    async read (): Promise<ETPacket> {
        if (this.localBuffer.length) {
            const serialized = this.localBuffer.shift()!
            // NOTE: no sequenceNumber++ here - revive() already counted it.
            return this.parse(serialized)
        }
        if (!this.reader) {
            throw new Error('BackedReader has no socket')
        }
        const lengthBytes = await this.reader.read(4)
        const length = lengthBytes.readInt32BE(0)
        if (length < PACKET_HEADER_SIZE || length > MAX_PROTO_LENGTH) {
            throw new Error(`Invalid ET packet length ${length}`)
        }
        const serialized = await this.reader.read(length)
        this.sequenceNumber++
        return this.parse(serialized)
    }

    private parse (serialized: Buffer): ETPacket {
        const encrypted = serialized[0]
        const header = serialized[1]
        const payload = serialized.subarray(PACKET_HEADER_SIZE)
        if (!encrypted) {
            throw new Error('Received an unencrypted ET packet on the encrypted stream')
        }
        return { header, payload: this.crypto.decrypt(payload) }
    }
}
