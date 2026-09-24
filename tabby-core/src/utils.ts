import * as os from 'os'
import { NgZone } from '@angular/core'
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { MenuItemOptions } from './api/menu'

export const WIN_BUILD_CONPTY_SUPPORTED = 17692
export const WIN_BUILD_CONPTY_STABLE = 18309
export const WIN_BUILD_WSL_EXE_DISTRO_FLAG = 17763
export const WIN_BUILD_WSL_EXE_CD_FLAG = 19041
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

/**
 * Removes items disabled through the "Context menu" settings tab from a
 * (possibly nested) list of context menu items. Items without an `id` are
 * always kept, since only explicitly registered items are configurable.
 */
export function filterContextMenuItems (items: MenuItemOptions[], disabledIds: string[]): MenuItemOptions[] {
    if (!disabledIds.length) {
        return items
    }
    return items.filter(item => !item.id || !disabledIds.includes(item.id))
}

/**
 * Sentinel value used in a context menu order array to represent a
 * user-added divider (separator) between items.
 */
export const CONTEXT_MENU_DIVIDER = '---'

/**
 * Reorders (and inserts dividers into) a flat list of context menu items
 * according to a saved order of item ids (and `CONTEXT_MENU_DIVIDER`
 * sentinels). Items whose id isn't mentioned in `order` are appended at
 * the end, in their original relative order, so newly added/unconfigured
 * items are never hidden.
 *
 * Any pre-existing separators in `items` (e.g. the automatic ones inserted
 * between provider "sections") are dropped and replaced by our own, single
 * separator ahead of the leftover/unmanaged items (if any). This avoids
 * ending up with two separators back-to-back, which Electron's native
 * `Menu` silently collapses into one - making a user-placed divider
 * indistinguishable from a pre-existing structural separator.
 */
export function applyContextMenuOrder (items: MenuItemOptions[], order: string[]): MenuItemOptions[] {
    if (!order.length) {
        return items
    }
    const byId = new Map<string, MenuItemOptions>()
    for (const item of items) {
        if (item.id) {
            byId.set(item.id, item)
        }
    }
    const used = new Set<string>()
    const result: MenuItemOptions[] = []
    for (const id of order) {
        if (id === CONTEXT_MENU_DIVIDER) {
            result.push({ type: 'separator' })
            continue
        }
        const item = byId.get(id)
        if (item) {
            result.push(item)
            used.add(id)
        }
    }
    const remaining = items.filter(item => item.type !== 'separator' && (!item.id || !used.has(item.id)))
    if (remaining.length) {
        if (result.length && result[result.length - 1].type !== 'separator') {
            result.push({ type: 'separator' })
        }
        result.push(...remaining)
    }
    return result
}

export function serializeFunction <T extends () => Promise<any>> (fn: T): T {
    let queue = Promise.resolve()
    return ((...args) => {
        const res = queue.then(() => fn(...args))
        queue = res.catch(() => null)
        return res
    }) as T
}
