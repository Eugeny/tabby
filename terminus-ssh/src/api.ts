import { BaseSession } from 'terminus-terminal'

export interface SSHConnection {
    name?: string
    host: string
    port: number
    user: string
    password?: string
    privateKey?: string
}

export class SSHSession extends BaseSession {
    constructor (private shell: any) {
        super()
    }

    start () {
        this.open = true

        this.shell.on('data', data => {
            this.emitOutput(data.toString())
        })

        this.shell.on('end', () => {
            if (this.open) {
                this.destroy()
            }
        })
    }

    resize (columns, rows) {
        this.shell.setWindow(rows, columns)
    }

    write (data) {
        this.shell.write(data)
    }

    kill (signal?: string) {
        this.shell.signal(signal || 'TERM')
    }

    async getChildProcesses (): Promise<any[]> {
        return []
    }

    async gracefullyKillProcess (): Promise<void> {
        this.kill('TERM')
    }

    async getWorkingDirectory (): Promise<string> {
        return null
    }
}
