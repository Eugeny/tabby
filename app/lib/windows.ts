import * as os from 'node:os'

export function getWindows10Build(): number | undefined {
    return process.platform === 'win32' && parseFloat(os.release()) >= 10 ? parseInt(os.release().split('.')[2], 10) : undefined
}

export function isWindowsBuild (build: number): boolean {
    const b = getWindows10Build()
    return b !== undefined && b >= build
}
