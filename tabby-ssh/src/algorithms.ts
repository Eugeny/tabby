import * as russh from 'russh'
import { SSHAlgorithmType } from './api'

export const supportedAlgorithms = {
    [SSHAlgorithmType.KEX]: russh.getSupportedKexAlgorithms().filter(x => x !== 'none'),
    [SSHAlgorithmType.HOSTKEY]: russh.getSupportedKeyTypes().filter(x => x !== 'none'),
    [SSHAlgorithmType.CIPHER]: russh.getSupportedCiphers().filter(x => x !== 'clear'),
    [SSHAlgorithmType.HMAC]: russh.getSupportedMACs().filter(x => x !== 'none'),
}

export const defaultAlgorithms = {
    [SSHAlgorithmType.KEX]: [
        'curve25519-sha256',
        'curve25519-sha256@libssh.org',
        'diffie-hellman-group16-sha512',
        'diffie-hellman-group14-sha256',
        'ext-info-c',
        'ext-info-s',
        'kex-strict-c-v00@openssh.com',
        'kex-strict-s-v00@openssh.com',
    ],
    [SSHAlgorithmType.HOSTKEY]: [
        'ssh-ed25519',
        'ecdsa-sha2-nistp256',
        'ecdsa-sha2-nistp521',
        'rsa-sha2-256',
        'rsa-sha2-512',
        'ssh-rsa',
    ],
    [SSHAlgorithmType.CIPHER]: [
        'chacha20-poly1305@openssh.com',
        'aes256-gcm@openssh.com',
        'aes256-ctr',
        'aes192-ctr',
        'aes128-ctr',
    ],
    [SSHAlgorithmType.HMAC]: [
        'hmac-sha2-512-etm@openssh.com',
        'hmac-sha2-256-etm@openssh.com',
        'hmac-sha2-512',
        'hmac-sha2-256',
        'hmac-sha1-etm@openssh.com',
        'hmac-sha1',
    ],
}
