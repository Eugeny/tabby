import 'ssh2'
const nodeCrypto = require('crypto')
const browserDH = require('diffie-hellman/browser')
nodeCrypto.createDiffieHellmanGroup = browserDH.createDiffieHellmanGroup
nodeCrypto.createDiffieHellman = browserDH.createDiffieHellman

// Declare function missing from @types
declare module 'ssh2' {
    interface Client {
        setNoDelay(enable?: boolean): this
    }
}