import * as ALGORITHMS from 'ssh2/lib/protocol/constants'
import { ALGORITHM_BLACKLIST, SSHAlgorithmType } from './api'

// Counteracts https://github.com/mscdex/ssh2/commit/f1b5ac3c81734c194740016eab79a699efae83d8
ALGORITHMS.DEFAULT_CIPHER.push('aes128-gcm')
ALGORITHMS.DEFAULT_CIPHER.push('aes256-gcm')
ALGORITHMS.SUPPORTED_CIPHER.push('aes128-gcm')
ALGORITHMS.SUPPORTED_CIPHER.push('aes256-gcm')

export const supportedAlgorithms: Record<string, string> = {}

for (const k of Object.values(SSHAlgorithmType)) {
    const supportedAlg = {
        [SSHAlgorithmType.KEX]: 'SUPPORTED_KEX',
        [SSHAlgorithmType.HOSTKEY]: 'SUPPORTED_SERVER_HOST_KEY',
        [SSHAlgorithmType.CIPHER]: 'SUPPORTED_CIPHER',
        [SSHAlgorithmType.HMAC]: 'SUPPORTED_MAC',
    }[k]
    supportedAlgorithms[k] = ALGORITHMS[supportedAlg].filter(x => !ALGORITHM_BLACKLIST.includes(x)).sort()
}
