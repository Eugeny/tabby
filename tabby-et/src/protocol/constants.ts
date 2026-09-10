/** ET wire protocol constants, verified against EternalTerminal @ PROTOCOL_VERSION 6. */

export const PROTOCOL_VERSION = 6

/** Packet header bytes. Sending anything else makes the remote abort (STFATAL). */
export enum ETPacketType {
    KEEP_ALIVE = 0,
    TERMINAL_BUFFER = 1,
    TERMINAL_INFO = 2,
    PORT_FORWARD_DESTINATION_REQUEST = 5,
    PORT_FORWARD_DESTINATION_RESPONSE = 6,
    PORT_FORWARD_DATA = 7,
    // 8, 9, 10 are etserver <-> etterminal only and never appear on TCP
    INITIAL_RESPONSE = 252,
    INITIAL_PAYLOAD = 253,
}

export enum ETConnectStatus {
    NEW_CLIENT = 1,
    RETURNING_CLIENT = 2,
    INVALID_KEY = 3,
    MISMATCHED_PROTOCOL = 4,
}

/** Nonce discriminator: the LAST byte of the 24-byte nonce. */
export const CLIENT_SERVER_NONCE_MSB = 0
export const SERVER_CLIENT_NONCE_MSB = 1

/** Serialized Packet = [encrypted:u8][header:u8][payload...] */
export const PACKET_HEADER_SIZE = 2

/** Length caps enforced by etserver; we enforce them too, defensively. */
export const MAX_PROTO_LENGTH = 128 * 1024 * 1024
export const MAX_HANDSHAKE_PROTO_LENGTH = 4 * 1024

/** BackedWriter buffer limits, matching ET. */
export const MAX_BACKUP_BYTES = 64 * 1024 * 1024
export const DISCONNECT_BUFFER_BYTES = 64 * 1024 * 1024

/** ET reads/writes the PTY in 16 KiB chunks. */
export const TERMINAL_CHUNK_SIZE = 16 * 1024

/** Port-forward payload chunk size. ET uses 1 KiB; any size is valid. */
export const PORT_FORWARD_CHUNK_SIZE = 16 * 1024

export const DEFAULT_ET_PORT = 2022

/** Timeouts (ms). */
export const HANDSHAKE_TIMEOUT = 30000
export const INITIAL_RESPONSE_TIMEOUT = 10000
export const RECONNECT_INTERVAL = 1000
export const PING_TIMEOUT = 5000
/** TCP connect timeout for the initial connection and every reconnect attempt. */
export const CONNECT_TIMEOUT = 10000

/**
 * etterminal splits the bootstrap line on '_', so TERM must not contain one.
 * This is not configurable on purpose. See ETERNAL_TERMINAL.md D8.
 */
export const ET_TERM = 'xterm-256color'
