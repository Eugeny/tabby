import { Socket } from 'net'
import { ETCrypto, MAC_BYTES } from './crypto'
import { DISCONNECT_BUFFER_BYTES, MAX_BACKUP_BYTES, PACKET_HEADER_SIZE } from './constants'
import { UnrecoverableSessionError } from './errors'

// Re-exported for the existing importers: the type now lives in ./errors so that
// crypto.ts can raise it too without a cycle (backedWriter already imports crypto).
export { UnrecoverableSessionError } from './errors'

/** Serialize a Packet: [encrypted=1][header][ciphertext]. */
function serializePacket (header: number, encryptedPayload: Buffer): Buffer {
    const out = Buffer.allocUnsafe(PACKET_HEADER_SIZE + encryptedPayload.length)
    out[0] = 1
    out[1] = header
    encryptedPayload.copy(out, PACKET_HEADER_SIZE)
    return out
}

export class BackedWriter {
    /** Number of packets ever written, including while disconnected. */
    sequenceNumber = 0

    /** Newest first, matching ET's push_front/pop_back deque. */
    private backupBuffer: Buffer[] = []
    private backupSize = 0
    private disconnectedBytes = 0
    private socket: Socket|null = null

    constructor (private crypto: ETCrypto) {}

    attach (socket: Socket): void {
        this.socket = socket
        this.disconnectedBytes = 0
    }

    detach (): void {
        this.socket = null
    }

    /**
     * Encrypt, buffer, and (if connected) send. Returns false if the packet had to be
     * dropped because the disconnect buffer is full.
     */
    write (header: number, payload: Buffer): boolean {
        // Size the serialized packet WILL have, computed without encrypting.
        // crypto_secretbox appends a MAC_BYTES tag, and serializePacket prepends
        // PACKET_HEADER_SIZE, so this exactly equals the eventual serialized length.
        const serializedLength = PACKET_HEADER_SIZE + MAC_BYTES + payload.length

        if (!this.socket && this.disconnectedBytes + serializedLength > DISCONNECT_BUFFER_BYTES) {
            // ET busy-waits here; we drop and let the caller surface a warning.
            // Crucially, the drop decision is made BEFORE encrypting: encrypting advances
            // the per-direction nonce counter, so encrypting a packet we then drop would
            // desync the nonce from sequenceNumber and make every later packet fail the
            // peer's MAC check. Matches BackedWriter.cpp, which returns SKIPPED before
            // packet.encrypt().
            return false
        }

        const serialized = serializePacket(header, this.crypto.encrypt(payload))

        this.backupBuffer.unshift(serialized)
        this.backupSize += serialized.length
        this.sequenceNumber++

        // Only trim while connected - never discard data we may still have to replay.
        while (this.socket && this.backupSize > MAX_BACKUP_BYTES) {
            this.backupSize -= this.backupBuffer.pop()!.length
        }

        if (!this.socket) {
            this.disconnectedBytes += serialized.length
            return true
        }

        const frame = Buffer.allocUnsafe(4 + serialized.length)
        frame.writeInt32BE(serialized.length, 0) // BIG-endian, 4 bytes, excludes itself
        serialized.copy(frame, 4)
        this.socket.write(frame)
        return true
    }

    /** Packets the peer says it never received, oldest first. */
    recover (lastValidSequenceNumber: number): Buffer[] {
        const toRecover = this.sequenceNumber - lastValidSequenceNumber
        if (toRecover < 0) {
            throw new UnrecoverableSessionError(
                'the server has received more packets than we ever sent (we are behind the server)',
            )
        }
        if (toRecover === 0) {
            return []
        }
        if (toRecover > this.backupBuffer.length) {
            throw new UnrecoverableSessionError(
                'the packets the server is missing have already been trimmed from the replay buffer',
            )
        }
        return this.backupBuffer.slice(0, toRecover).reverse()
    }
}
