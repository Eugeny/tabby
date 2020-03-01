import * as os from 'os'

export const WIN_BUILD_CONPTY_SUPPORTED = 17692
export const WIN_BUILD_CONPTY_STABLE = 18309
export const WIN_BUILD_WSL_EXE_DISTRO_FLAG = 17763
export const WIN_BUILD_FLUENT_BG_SUPPORTED = 17063
export const WIN_BUILD_FLUENT_BG_MOVE_BUG_FIXED = 18917

export function isWindowsBuild (build: number): boolean {
    return process.platform === 'win32' && parseFloat(os.release()) >= 10 && parseInt(os.release().split('.')[2]) >= build
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getCSSFontFamily (config: any): string {
    let fonts: string[] = config.terminal.font.split(',').map(x => x.trim().replace(/"/g, ''))
    if (config.terminal.fallbackFont) {
        fonts.push(config.terminal.fallbackFont)
    }
    fonts.push('monospace-fallback')
    fonts.push('monospace')
    fonts = fonts.map(x => `"${x}"`)
    return fonts.join(', ')
}
