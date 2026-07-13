import { app } from 'electron'
import * as nodeModule from 'module'
import * as fs from 'fs'
import * as path from 'path'

// This module is imported before any other main-process module so that errors thrown
// while importing those modules (which run before index.ts's own body) still get logged.
nodeModule.enableCompileCache?.()

export function logMainError (label: string, err: unknown): void {
    const detail = err instanceof Error ? err.stack ?? err.message : String(err)
    const message = `[${new Date().toISOString()}] ${label}: ${detail}\n`
    process.stderr.write(message)
    try {
        const dir = process.env.TABBY_CONFIG_DIRECTORY ?? app.getPath('userData')
        fs.appendFileSync(path.join(dir, 'main-process-errors.log'), message)
    } catch { }
}

process.on('uncaughtException', err => logMainError('uncaughtException', err))
process.on('unhandledRejection', reason => logMainError('unhandledRejection', reason))
