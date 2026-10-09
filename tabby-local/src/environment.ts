let wnr: any = null

try {
    wnr = require('windows-native-registry') // eslint-disable-line @typescript-eslint/no-var-requires
} catch { }

let cachedEnvironment: Record<string, string>|null = null

/** Strips `undefined` values from a process-style environment object. */
function normalizeEnv (env: Record<string, string|undefined>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(env)) {
        if (value !== undefined) {
            result[key] = value
        }
    }
    return result
}

/**
 * Resolves a variable name to its actual key in `env`. Lookups are
 * case-insensitive on Windows, where environment variable names are.
 */
function findKey (env: Record<string, string>, name: string): string|undefined {
    if (name in env) {
        return name
    }
    if (process.platform !== 'win32') {
        return undefined
    }
    const lower = name.toLowerCase()
    return Object.keys(env).find(k => k.toLowerCase() === lower)
}

/** Iteratively expands `%VAR%` references within an environment block in place. */
function expandWindowsEnv (env: Record<string, string>): void {
    const pattern = /%([^%]+)%/g
    let changed = true
    let iterations = 0
    while (changed && iterations < 10) {
        changed = false
        iterations++
        for (const [key, value] of Object.entries(env)) {
            const expanded = value.replace(pattern, (match, varName) => {
                const found = findKey(env, varName)
                return found !== undefined ? env[found] : match
            })
            if (expanded !== env[key]) {
                env[key] = expanded
                changed = true
            }
        }
    }
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
    const lower = name.toLowerCase()
    return lower === 'path' || lower === 'pathext'
}

/**
 * Merges a registry environment source into `target`. Most variables override,
 * but `Path`/`PATHEXT` are appended to the existing value (resolved
 * case-insensitively so e.g. system `Path` and user `PATH` don't split).
 */
function mergeRegistryEnv (target: Record<string, string>, source: Record<string, string>): void {
    for (const [key, value] of Object.entries(source)) {
        const existingKey = isPathLikeVar(key) ? findKey(target, key) : undefined
        if (existingKey !== undefined) {
            target[existingKey] = target[existingKey] && value
                ? target[existingKey] + ';' + value
                : target[existingKey] || value
        } else {
            target[key] = value
        }
    }
}

/**
 * Rebuilds the environment block from Windows registry sources,
 * mimicking the behavior of Windows Terminal's environment refresh.
 */
function buildWindowsEnvironment (): Record<string, string> {
    const merged: Record<string, string> = {}

    // System env vars as base, then user and volatile overrides (Path/PATHEXT appended)
    mergeRegistryEnv(merged, readRegistryEnv(wnr.HK.LM, 'SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'))
    mergeRegistryEnv(merged, readRegistryEnv(wnr.HK.CU, 'Environment'))
    mergeRegistryEnv(merged, readRegistryEnv(wnr.HK.CU, 'Volatile Environment'))

    // Preserve process-specific vars (e.g. Electron, Node, Angular)
    // that aren't defined in the registry
    for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined && findKey(merged, key) === undefined) {
            merged[key] = value
        }
    }

    expandWindowsEnv(merged)
    return merged
}

export function getEnvironment (refreshFromRegistry = false): Record<string, string> {
    if (process.platform === 'win32' && refreshFromRegistry) {
        cachedEnvironment = buildWindowsEnvironment()
    } else {
        cachedEnvironment ??= normalizeEnv(process.env)
    }
    return cachedEnvironment
}

/** Expands `%VAR%` (Windows) / `$VAR` (POSIX) references using the cached environment. */
export function substituteEnv (env: Record<string, string>): Record<string, string> {
    const base = getEnvironment()
    env = { ...env }
    const pattern = process.platform === 'win32' ? /%(\w+)%/g : /\$(\w+)\b/g
    for (const [key, value] of Object.entries(env)) {
        env[key] = value.toString().replace(pattern, (substring, p1) => {
            const found = findKey(base, p1)
            return found !== undefined ? base[found] : ''
        })
    }
    return env
}
