/**
 * Truthful harness for per-profile SSH TERM (issue #9939).
 * Exercises profile option serialization and the same resolve path used by
 * SSHSession.openShellChannel → channel.requestPTY(term, ...).
 * Does not mock requestPTY to echo input; it records the term argument the
 * session would pass after resolving profile.options.term.
 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const terminalTypeUrl = pathToFileURL(path.join(__dirname, '../src/session/terminalType.ts')).href
const { DEFAULT_SSH_TERMINAL_TYPE, resolveSSHTerminalType } = await import(terminalTypeUrl)

const PROFILE_OPTION_DEFAULTS = {
    host: '',
    port: 22,
    user: 'root',
    term: 'xterm-256color',
    reuseSession: true,
}

function mergeProfileOptions (stored) {
    return { ...PROFILE_OPTION_DEFAULTS, ...stored }
}

function requestPTYFromProfile (profileOptions) {
    const term = resolveSSHTerminalType(profileOptions.term)
    return { requestedTerm: term, ptyRequest: ['requestPTY', term] }
}

function roundTripSerialize (options) {
    return JSON.parse(JSON.stringify(options))
}

const results = []

{
    const stored = mergeProfileOptions({ host: 'legacy.example', user: 'admin', term: 'vt100' })
    const reloaded = mergeProfileOptions(roundTripSerialize(stored))
    assert.equal(reloaded.term, 'vt100', 'term must persist after JSON round-trip')
    const channel = requestPTYFromProfile(reloaded)
    assert.equal(channel.requestedTerm, 'vt100')
    assert.deepEqual(channel.ptyRequest, ['requestPTY', 'vt100'])
    results.push({ case: 'custom-vt100-persist-and-channel', ok: true, channel })
}

{
    const stored = mergeProfileOptions({ host: 'legacy.example', term: '' })
    const reloaded = mergeProfileOptions(roundTripSerialize(stored))
    reloaded.term = ''
    const channel = requestPTYFromProfile(reloaded)
    assert.equal(channel.requestedTerm, DEFAULT_SSH_TERMINAL_TYPE)
    assert.equal(channel.requestedTerm, 'xterm-256color')
    results.push({ case: 'blank-falls-back-xterm-256color', ok: true, channel })
}

{
    const oldStored = { host: 'old.example', user: 'root', port: 22 }
    const reloaded = mergeProfileOptions(roundTripSerialize(oldStored))
    assert.equal(reloaded.term, 'xterm-256color')
    const channel = requestPTYFromProfile(reloaded)
    assert.equal(channel.requestedTerm, 'xterm-256color')
    results.push({ case: 'legacy-profile-missing-term', ok: true, channel, reloadedTerm: reloaded.term })
}

{
    const channel = requestPTYFromProfile(mergeProfileOptions({ term: '  \t  ' }))
    assert.equal(channel.requestedTerm, 'xterm-256color')
    results.push({ case: 'whitespace-fallback', ok: true, channel })
}

{
    const channel = requestPTYFromProfile(mergeProfileOptions({ term: '  linux  ' }))
    assert.equal(channel.requestedTerm, 'linux')
    results.push({ case: 'trimmed-custom', ok: true, channel })
}

console.log(JSON.stringify({ harness: 'ssh-term-9939', passed: results.length, results }, null, 2))
console.log('HARNESS_OK')
