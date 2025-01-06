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
        const id = ipcRenderer.sendSync('pty:spawn', ...options)
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
    private truePID: Promise<number>

    constructor (
        private id: string,
    ) {
        super()
        this.truePID = new Promise(async (resolve) => {
            let pid = await this.getPID()
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
            } finally {
                resolve(pid)
            }
        })
        this.truePID = this.truePID.catch(() => this.getPID())
    }

    getID (): string {
        return this.id
    }

    getTruePID (): Promise<number> {
        return this.truePID
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
            const processes = await macOSNativeProcessList.getProcessList()
            return processes.filter(x => x.ppid === truePID).map(p => ({
                pid: p.pid,
                ppid: p.ppid,
                command: p.name,
            }))
        }
        if (process.platform === 'win32') {
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
