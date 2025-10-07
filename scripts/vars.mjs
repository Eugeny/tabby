import * as path from 'path'
import * as fs from 'fs'
import * as semver from 'semver'
import * as childProcess from 'child_process'

process.env.ARCH = ((process.env.ARCH || process.arch) === 'arm') ? 'armv7l' : (process.env.ARCH || process.arch)

import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const electronInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../node_modules/electron/package.json')))

// --- Robust version derivation (works even when fork has no tags) ---
let rawDescribe = ''
try {
  // try to get something like v1.0.227-4-gc5e402c
  rawDescribe = childProcess.execSync('git describe --tags --abbrev=7', { encoding: 'utf-8' }).trim()
} catch { /* ignore */ }

let version
if (rawDescribe) {
  // strip leading "v"
  version = rawDescribe.replace(/^v/, '')
  // keep upstream behavior: convert first "-" to "-c"
  if (version.includes('-')) {
    version = version.replace('-', '-c')
  }
  if (version.includes('-c')) {
    try {
      // turn e.g. 1.0.227-c4... into next prepatch nightly
      const rev = process.env.REV ?? process.env.GITHUB_RUN_NUMBER ?? 0
      version = semver.inc(version, 'prepatch').replace('-0', `-nightly.${rev}`)
    } catch {
      version = null
    }
  }
}

if (!version) {
  // Fallback when tags are unavailable or semver parsing failed
  let sha = '0000000'
  try { sha = childProcess.execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim() } catch { /* ignore */ }
  const base = process.env.FALLBACK_BASE_VERSION || '1.0.0'
  const rev = process.env.REV ?? process.env.GITHUB_RUN_NUMBER ?? '0'
  version = `${base}-nightly.${rev}.${sha}`
}

export { version }

export const builtinPlugins = [
  'tabby-core',
  'tabby-settings',
  'tabby-terminal',
  'tabby-web',
  'tabby-community-color-schemes',
  'tabby-ssh',
  'tabby-serial',
  'tabby-telnet',
  'tabby-local',
  'tabby-electron',
  'tabby-plugin-manager',
  'tabby-linkifier',
  'tabby-auto-sudo-password',
]

export const packagesWithDocs = [
  ['.', 'tabby-core'],
  ['terminal', 'tabby-terminal'],
  ['local', 'tabby-local'],
  ['settings', 'tabby-settings'],
]

export const allPackages = [
  ...builtinPlugins,
  'web',
  'tabby-web-demo',
]

export const bundledModules = [
  '@angular',
  '@ng-bootstrap',
]

export const electronVersion = electronInfo.version

export const keygenConfig = {
  provider: 'keygen',
  account: 'a06315f2-1031-47c6-9181-e92a20ec815e',
  channel: 'stable',
  product: {
    win32: {
      x64: 'f481b9d6-d5da-4970-b926-f515373e986f',
      arm64: '950999b9-371c-419b-b291-938c5e4d364c',
    }[process.env.ARCH],
    darwin: {
      arm64: '98fbadee-c707-4cd6-9d99-56683595a846',
      x86_64: 'f5a48841-d5b8-4b7b-aaa7-cf5bffd36461',
      x64: 'f5a48841-d5b8-4b7b-aaa7-cf5bffd36461',
    }[process.env.ARCH],
    linux: {
      x64: '7bf45071-3031-4a26-9f2e-72604308313e',
      arm64: '39e3c736-d4d4-4fbf-a201-324b7bab0d17',
      armv7l: '50ae0a82-7f47-4fa4-b0a8-b0d575ce9409',
      armhf: '7df5aa12-04ab-4075-a0fe-93b0bbea9643',
    }[process.env.ARCH],
  }[process.platform],
}

if (!keygenConfig.product) {
  throw new Error(`Unrecognized platform ${process.platform}/${process.env.ARCH}`)
}
