const nodeCrypto = require('crypto')
const browserDH = require('diffie-hellman/browser')
nodeCrypto.createDiffieHellmanGroup = browserDH.createDiffieHellmanGroup
nodeCrypto.createDiffieHellman = browserDH.createDiffieHellman
