import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { applyAppUserModelId } from '../lib/appUserModelId.ts'

function registeredIds (proc: { platform: NodeJS.Platform, defaultApp?: boolean }): string[] {
    const registered: string[] = []
    applyAppUserModelId({ setAppUserModelId: id => registered.push(id) }, proc)
    return registered
}

test('on Windows the app registers the installer\'s AppUserModelID', () => {
    const builderConfig = readFileSync(new URL('../../electron-builder.yml', import.meta.url), 'utf8')
    const installerAppId = /^appId:\s*(\S+)\s*$/m.exec(builderConfig)?.[1]
    assert.ok(installerAppId, 'electron-builder.yml has no appId')

    assert.deepEqual(registeredIds({ platform: 'win32' }), [installerAppId])
})

test('outside Windows the app registers no AppUserModelID', () => {
    assert.deepEqual(registeredIds({ platform: 'linux' }), [])
    assert.deepEqual(registeredIds({ platform: 'darwin' }), [])
})

test('a dev build on Windows does not take over the installed app\'s AppUserModelID', () => {
    assert.deepEqual(registeredIds({ platform: 'win32', defaultApp: true }), [])
})
