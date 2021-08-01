import * as ALGORITHMS from 'ssh2/lib/protocol/constants'
import { ALGORITHM_BLACKLIST, SSHAlgorithmType } from './api'

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
