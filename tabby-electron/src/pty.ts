import * as psNode from 'ps-node'
import { ipcRenderer } from 'electron'
import { ChildProcess, PTYInterface, PTYProxy } from 'tabby-local'
import { getWorkingDirectoryFromPID } from 'native-process-working-directory'

/* eslint-disable block-scoped-var */

try {
    var macOSNativeProcessList = require('macos-native-processlist')  // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

try {
    var windowsProcessTree = require('@tabby-gang/windows-process-tree')  // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

export class ElectronPTYInterface extends PTYInterface {
    async spawn (...options: any[]): Promise<PTYProxy> {
        const id = await ipcRenderer.invoke('pty:spawn', ...options)
        return new ElectronPTYProxy(id)
    }

    async restore (id: string): Promise<ElectronPTYProxy|null> {
        if (ipcRenderer.sendSync('pty:exists', id)) {
            return new ElectronPTYProxy(id)
        }
        return null
    }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ElectronPTYProxy extends PTYProxy {
    private subscriptions: Map<string, any> = new Map()
    private directPID: Promise<number>
    private truePID: number|null = null

    constructor (
        private id: string,
    ) {
        super()
        this.directPID = this.getPID()
        this.refineTruePID()
    }

    getID (): string {
        return this.id
    }

    // Returns the best PID known so far: the directly spawned process until the
    // delayed child-chain probe completes. Previously this awaited that probe's
    // fixed 2s delay, which stalled every consumer (e.g. opening a new tab
    // inherits the active tab's CWD) for up to 2s after a spawn.
    async getTruePID (): Promise<number> {
        return this.truePID ?? this.directPID
    }

    private async refineTruePID (): Promise<void> {
        let pid = await this.directPID
        try {
            await new Promise(r => setTimeout(r, 2000))

            // Retrieve any possible single children now that shell has fully started
            let processes = await this.getChildProcessesInternal(pid)
            while (pid && processes.length === 1) {
                if (!processes[0].pid) {
                    break
                }
                pid = processes[0].pid
                processes = await this.getChildProcessesInternal(pid)
            }
        } catch { }
        this.truePID = pid
    }

    async getPID (): Promise<number> {
        return ipcRenderer.sendSync('pty:get-pid', this.id)
    }

    subscribe (event: string, handler: (..._: any[]) => void): void {
        const key = `pty:${this.id}:${event}`
        const newHandler = (_event, ...args) => handler(...args)
        this.subscriptions.set(key, newHandler)
        ipcRenderer.on(key, newHandler)
    }

    ackData (length: number): void {
        ipcRenderer.send('pty:ack-data', this.id, length)
    }

    unsubscribeAll (): void {
        for (const k of this.subscriptions.keys()) {
            ipcRenderer.off(k, this.subscriptions.get(k))
        }
    }

    async resize (columns: number, rows: number): Promise<void> {
        ipcRenderer.send('pty:resize', this.id, columns, rows)
    }

    async write (data: Buffer): Promise<void> {
        ipcRenderer.send('pty:write', this.id, data)
    }

    async kill (signal?: string): Promise<void> {
        ipcRenderer.send('pty:kill', this.id, signal)
    }

    async getChildProcesses (): Promise<ChildProcess[]> {
        return this.getChildProcessesInternal(await this.getTruePID())
    }

    async getChildProcessesInternal (truePID: number): Promise<ChildProcess[]> {
        if (process.platform === 'darwin') {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!macOSNativeProcessList) {
                // a missing optional native module must not make tabs unclosable
                return []
            }
            const processes = await macOSNativeProcessList.getProcessList()
            return processes.filter(x => x.ppid === truePID).map(p => ({
                pid: p.pid,
                ppid: p.ppid,
                command: p.name,
            }))
        }
        if (process.platform === 'win32') {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!windowsProcessTree) {
                return []
            }
            return new Promise<ChildProcess[]>(resolve => {
                windowsProcessTree.getProcessTree(truePID, tree => {
                    resolve(tree ? tree.children.map(child => ({
                        pid: child.pid,
                        ppid: tree.pid,
                        command: child.name,
                    })) : [])
                })
            })
        }
        return new Promise<ChildProcess[]>((resolve, reject) => {
            psNode.lookup({ ppid: truePID }, (err, processes) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(processes as ChildProcess[])
            })
        })
    }

    async getWorkingDirectory (): Promise<string|null> {
        return getWorkingDirectoryFromPID(await this.getTruePID())
    }

}
