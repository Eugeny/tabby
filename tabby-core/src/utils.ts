import * as os from 'os'
import { NgZone } from '@angular/core'
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'

export const WIN_BUILD_CONPTY_SUPPORTED = 17692
export const WIN_BUILD_CONPTY_STABLE = 18309
export const WIN_BUILD_WSL_EXE_DISTRO_FLAG = 17763
export const WIN_BUILD_FLUENT_BG_SUPPORTED = 17063

export function getWindows10Build (): number|undefined {
    return process.platform === 'win32' && parseFloat(os.release()) >= 10 ? parseInt(os.release().split('.')[2]) : undefined
}

export function isWindowsBuild (build: number): boolean {
    const b = getWindows10Build()
    return b !== undefined && b >= build
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getCSSFontFamily (config: any): string {
    let fonts: string[] = config.terminal.font.split(',').map(x => x.trim().replaceAll('"', ''))
    if (config.terminal.fallbackFont) {
        fonts.push(config.terminal.fallbackFont)
    }
    fonts.push('monospace-fallback')
    fonts.push('monospace')
    fonts = fonts.map(x => `"${x}"`)
    return fonts.join(', ')
}

export function wrapPromise <T> (zone: NgZone, promise: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        promise.then(result => {
            zone.run(() => resolve(result))
        }).catch(error => {
            zone.run(() => reject(error))
        })
    })
}

export class ResettableTimeout {
    private id: any = null

    constructor (private fn: () => void, private timeout: number) {}

    set (timeout?: number): void {
        this.clear()
        this.id = setTimeout(this.fn, timeout ?? this.timeout)
    }

    clear (): void {
        if (this.id) {
            clearTimeout(this.id)
        }
    }
}

export const TAB_COLORS = [
    { name: _('No color'), value: null },
    { name: _('Blue'), value: '#0275d8' },
    { name: _('Green'), value: '#5cb85c' },
    { name: _('Orange'), value: '#f0ad4e' },
    { name: _('Purple'), value: '#613d7c' },
    { name: _('Red'), value: '#d9534f' },
    { name: _('Yellow'), value: '#ffd500' },
]

export function serializeFunction <T extends () => Promise<any>> (fn: T): T {
    let queue = Promise.resolve()
    return ((...args) => {
        const res = queue.then(() => fn(...args))
        queue = res.catch(() => null)
        return res
    }) as T
}
