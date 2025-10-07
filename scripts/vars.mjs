// scripts/vars.mjs
import * as path from 'path'
import * as fs from 'fs'
import * as semver from 'semver'
import * as childProcess from 'child_process'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

// Normalize ARCH for other scripts
process.env.ARCH = ((process.env.ARCH || process.arch) === 'arm') ? 'armv7l' : (process.env.ARCH || process.arch)

// Read electron + package versions
const electronInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../node_modules/electron/package.json'), 'utf8'))
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'))

function tryDescribe () {
  try {
    // Match only version-like tags (vX.Y.Z), but allow describe to fall back to sha if needed
    return childProcess.execSync('git describe --tags --match "v[0-9]*" --dirty --always', { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

function computeVersion () {
  // Allow CI to force a version (optional)
  if (process.env.BUILD_VERSION) {
    return process.env.BUILD_VERSION
  }

  const described = tryDescribe()
  const rev = process.env.REV
    ?? process.env.GITHUB_RUN_NUMBER
    ?? (process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : '0')

  // If we got a semver-ish tag, use it (strip leading "v")
  if (described && /^v?\d+\.\d+\.\d+/.test(described)) {
    let v = described.replace(/^v/, '')
    // If "describe" added a suffix (e.g., v1.2.3-45-gHASH), make it a nightly prerelease
    if (v.includes('-')) {
      v = v.replace('-', '-c') // keep previous behavior
      const inc = semver.inc(v, 'prepatch')
      if (inc) {
        v = inc.replace('-0', `-nightly.${rev}`)
      }
    }
    return v
  }

  // Fallback: use package.json version and make a nightly
  const base = pkg.version || '0.0.0'
  if (base.includes('-')) {
    return `${base}.${rev}`
  }
  return `${base}-nightly.${rev}`
}

export const version = computeVersion()

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
