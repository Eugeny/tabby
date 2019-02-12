import * as os from 'os'

export const WIN_BUILD_CONPTY_SUPPORTED = 17692
export const WIN_BUILD_CONPTY_STABLE = 18309

export function isWindowsBuild (build: number): boolean {
    return process.platform === 'win32' && parseFloat(os.release()) >= 10 && parseInt(os.release().split('.')[2]) >= build
}
