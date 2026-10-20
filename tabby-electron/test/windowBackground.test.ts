import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, it } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = ts.transpileModule(readFileSync(new URL('../../app/lib/window.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText

// Exercise the actual main-process window and IPC handlers without starting Electron.
function createWindow (type = 'blur', build = 22621, platform = 'win32', disableWhileDragging = false) {
    const ipcMain = new EventEmitter()
    const nativeTheme = { themeSource: 'system' }
    class BrowserWindow extends EventEmitter {
        materials: string[] = []
        opacities: number[] = []
        vibrancies: (string|null)[] = []
        blurType: string|null = null
        blurEnabled = false
        webContents = Object.assign(new EventEmitter(), {
            send () {},
            setVisualZoomLevelLimits () {},
            setZoomFactor () {},
            setWindowOpenHandler () {},
            session: { setPermissionCheckHandler () {}, setDevicePermissionHandler () {}, setSpellCheckerEnabled () {} },
        })

        static getFocusedWindow () { return null }
        setBackgroundMaterial (material: string) { this.materials.push(material) }
        setOpacity (opacity: number) { this.opacities.push(opacity) }
        setVibrancy (material: string|null) { this.vibrancies.push(material) }
        setBlur (enabled: boolean) { this.blurEnabled = enabled }
        setBackgroundColor () {}
        setTouchBar () {}
        loadFile () {}
        setMenu () {}
        flashFrame () {}
        isMaximized () { return false }
        getBounds () { return { x: 0, y: 0, width: 800, height: 600 } }
    }
    const mocks = {
        electron: {
            BrowserWindow, ipcMain, nativeTheme,
            app: { getAppPath: () => '.', getPath: () => '.' },
            nativeImage: { createFromPath: () => null },
            TouchBar: Object.assign(class {}, { TouchBarSegmentedControl: class {} }),
        },
        glasstron: { BrowserWindow },
        'electron-updater': { autoUpdater: new EventEmitter() },
        'electron-config': class { get () { return undefined } },
        '@electron/remote/main': { enable () {} },
        'macos-release': () => ({ version: '15.0' }),
        './windows': { isWindowsBuild: (minimum: number) => platform === 'win32' && build >= minimum },
        './cli': {},
        './urlHandler': {},
    }
    const exports: any = {}
    runInNewContext(source, {
        exports,
        require: name => name in mocks ? mocks[name] : require(name),
        process: { platform },
        __dirname: fileURLToPath(new URL('../../app/lib', import.meta.url)),
        console, setTimeout, clearTimeout,
    })
    const window = new exports.Window({ focus () {} }, {
        appearance: { vibrancy: true, vibrancyType: type, colorSchemeMode: 'dark' },
        hacks: { disableVibrancyWhileDragging: disableWhileDragging },
    }, { hidden: true })
    const native: BrowserWindow = window.window
    const send = (event: string, ...args: any[]) => ipcMain.emit(event, { sender: native.webContents }, ...args)
    native.webContents.emit('did-finish-load')
    return { window, native, nativeTheme, send }
}

describe('Windows background materials', () => {
    for (const [type, material] of [['blur', 'acrylic'], ['fluent', 'acrylic'], ['mica', 'mica'], ['mica-alt', 'tabbed']]) {
        it(`restores ${type} on startup, focus, blur, and IPC changes`, () => {
            const { native, send } = createWindow(type)
            assert.deepEqual(native.materials, [material])
            native.emit('focus')
            native.emit('blur')
            assert.deepEqual(native.materials, [material, material, material])
            send('window-set-vibrancy', false, type)
            assert.equal(native.materials.at(-1), 'none')
            native.emit('focus')
            native.emit('blur')
            assert.equal(native.materials.at(-1), 'none')
            send('window-set-vibrancy', true, type)
            assert.equal(native.materials.at(-1), material)
        })
    }

    for (const type of ['mica', 'mica-alt']) {
        it(`keeps ${type} opaque and restores the preferred opacity when switching away`, () => {
            const { native, send } = createWindow('blur')
            send('window-set-opacity', 0.6)
            assert.equal(native.opacities.at(-1), 0.6)
            send('window-set-vibrancy', true, type)
            assert.equal(native.opacities.at(-1), 1)
            send('window-set-opacity', 0.7)
            assert.equal(native.opacities.at(-1), 1)
            send('window-set-vibrancy', false, type)
            assert.equal(native.opacities.at(-1), 0.7)
            send('window-set-vibrancy', true, type)
            send('window-set-vibrancy', true, 'blur')
            assert.equal(native.opacities.at(-1), 0.7)
        })

        it(`does not disable ${type} while dragging when the fluent workaround is enabled`, async () => {
            const { native, send } = createWindow(type, 22621, 'win32', true)
            send('window-set-disable-vibrancy-while-dragging', true)
            native.emit('move')
            native.emit('resize')
            await new Promise(resolve => setTimeout(resolve, 75))
            assert.equal(native.materials.length, 1)
        })
    }

    it('still disables and restores acrylic while dragging when requested', async () => {
        const { native, send } = createWindow('blur', 22621, 'win32', true)
        send('window-set-disable-vibrancy-while-dragging', true)
        native.emit('resize')
        assert.equal(native.materials.at(-1), 'none')
        await new Promise(resolve => setTimeout(resolve, 75))
        assert.equal(native.materials.at(-1), 'acrylic')
    })

    for (const build of [19045, 22000]) {
        it(`retains legacy blur and fluent behavior on Windows build ${build}`, () => {
            const { native, send } = createWindow('blur', build)
            assert.deepEqual(native.materials, [])
            assert.equal(native.blurType, 'blurbehind')
            send('window-set-vibrancy', true, 'fluent')
            assert.equal(native.blurType, 'acrylic')
            send('window-set-vibrancy', true, 'mica')
            assert.equal(native.blurType, 'blurbehind')
            send('window-set-opacity', 0.6)
            assert.equal(native.opacities.at(-1), 0.6)
        })
    }

    it('applies the app light, dark, and system theme to native Windows materials', () => {
        const { nativeTheme, send } = createWindow('mica')
        assert.equal(nativeTheme.themeSource, 'dark')
        for (const [mode, expected] of [['light', 'light'], ['auto', 'system'], ['dark', 'dark']]) {
            send('window-set-dark-mode', mode)
            assert.equal(nativeTheme.themeSource, expected)
        }
    })

    for (const platform of ['darwin', 'linux']) {
        it(`does not use Windows background materials or force opacity on ${platform}`, () => {
            const { native, send } = createWindow('mica', 22621, platform)
            send('window-set-vibrancy', true, 'mica')
            send('window-set-opacity', 0.6)
            assert.deepEqual(native.materials, [])
            assert.equal(native.opacities.at(-1), 0.6)
            if (platform === 'darwin') {
                assert.equal(native.vibrancies.at(-1), 'fullscreen-ui')
            } else {
                assert.equal(native.blurEnabled, true)
            }
        })
    }
})
