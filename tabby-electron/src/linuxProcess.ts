import { spawn } from 'child_process'
import { createInterface } from 'readline'
import type { ChildProcess } from 'tabby-local'

interface LinuxChildProcess extends ChildProcess {
    arguments: string[]
}

/** @hidden */
export function parseLinuxProcess (line: string, parentPID: number): LinuxChildProcess|null {
    const match = /^\s*(\d+)\s+(\d+)\s+(\S+)(?:\s+(.*))?$/.exec(line)
    if (!match || Number(match[2]) !== parentPID) {
        return null
    }
    return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        command: match[3],
        arguments: (match[4] || '').split(/\s+/).filter(Boolean),
    }
}

/** @hidden */
export function getLinuxChildProcesses (parentPID: number): Promise<ChildProcess[]> {
    if (!Number.isSafeInteger(parentPID) || parentPID <= 0) {
        return Promise.resolve([])
    }
    return new Promise((resolve, reject) => {
        // Query direct children only. Keep full command arguments without the
        // process-table parser's per-character connected-domain analysis.
        const child = spawn('ps', ['--ppid', String(parentPID), '-o', 'pid=,ppid=,args=', '-ww'])
        const processes: LinuxChildProcess[] = []
        let stderr = ''
        child.stderr.setEncoding('utf8').on('data', data => { stderr += data })
        const lines = createInterface({ input: child.stdout, crlfDelay: Infinity })
        lines.on('line', line => {
            const process = parseLinuxProcess(line, parentPID)
            if (process) {
                processes.push(process)
            }
        })
        lines.on('error', reject)
        child.on('error', reject)
        child.on('close', (code, signal) => {
            // procps returns 1 when no processes match the selection.
            if (code === 0 || code === 1 && processes.length === 0 && !stderr.trim()) {
                resolve(processes)
            } else {
                reject(new Error(stderr.trim() || `ps exited with ${signal ?? code}`))
            }
        })
    })
}
