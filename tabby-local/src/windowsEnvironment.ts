let wnr: any = null

try {
    wnr = require('windows-native-registry') // eslint-disable-line @typescript-eslint/no-var-requires
} catch { }

function expandWindowsEnv (env: Record<string, string>): Record<string, string> {
    const result = { ...env }
    const pattern = /%([^%]+)%/g
    let changed = true
    let iterations = 0
    while (changed && iterations < 10) {
        changed = false
        iterations++
        for (const [key, value] of Object.entries(result)) {
            const expanded = value.replace(pattern, (match, varName) => {
                const lookup = varName.toLowerCase()
                const foundKey = Object.keys(result).find(k => k.toLowerCase() === lookup)
                if (foundKey !== undefined) {
                    return result[foundKey]
                }
                const processKey = Object.keys(process.env).find(k => k.toLowerCase() === lookup)
                if (processKey !== undefined) {
                    return process.env[processKey]!
                }
                return match
            })
            if (expanded !== result[key]) {
                result[key] = expanded
                changed = true
            }
        }
    }
    return result
}

function readRegistryEnv (hive: any, path: string): Record<string, string> {
    const env: Record<string, string> = {}
    if (!wnr) {
        return env
    }
    try {
        const key = wnr.getRegistryKey(hive, path)
        if (!key) {
            return env
        }
        for (const [name, entry] of Object.entries(key)) {
            if (!name || typeof name !== 'string') {
                continue
            }
            const e = entry as any
            if (e && typeof e.value === 'string') {
                env[name] = e.value
            }
        }
    } catch {
        // ignore registry read errors
    }
    return env
}

function isPathLikeVar (name: string): boolean {
    return name.toLowerCase() === 'path' || name.toLowerCase() === 'pathext'
}

function mergePathValue (existing: string, additional: string): string {
    if (!existing) {
        return additional
    }
    if (!additional) {
        return existing
    }
    return existing + ';' + additional
}

/**
 * Rebuilds the environment block from Windows registry sources,
 * mimicking the behavior of Windows Terminal's environment refresh.
 * Falls back to process.env if windows-native-registry is unavailable.
 */
export function getWindowsEnvironment (): Record<string, string> {
    if (!wnr) {
        const result: Record<string, string> = {}
        for (const [key, value] of Object.entries(process.env)) {
            if (value !== undefined) {
                result[key] = value
            }
        }
        return result
    }

    const systemEnv = readRegistryEnv(wnr.HK.LM, 'SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment')
    const userEnv = readRegistryEnv(wnr.HK.CU, 'Environment')
    const volatileEnv = readRegistryEnv(wnr.HK.CU, 'Volatile Environment')

    const merged: Record<string, string> = {}

    // System env vars as base
    for (const [key, value] of Object.entries(systemEnv)) {
        merged[key] = value
    }

    // User env vars override system, but Path/PATHEXT are merged
    for (const [key, value] of Object.entries(userEnv)) {
        if (isPathLikeVar(key) && merged[key]) {
            merged[key] = mergePathValue(merged[key], value)
        } else {
            merged[key] = value
        }
    }

    // Volatile env vars override, but Path/PATHEXT are merged
    for (const [key, value] of Object.entries(volatileEnv)) {
        if (isPathLikeVar(key) && merged[key]) {
            merged[key] = mergePathValue(merged[key], value)
        } else {
            merged[key] = value
        }
    }

    // Preserve process-specific vars (e.g. Electron, Node, Angular)
    // that aren't defined in the registry
    for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined && !(key in merged)) {
            merged[key] = value
        }
    }

    return expandWindowsEnv(merged)
}
