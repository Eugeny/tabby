import { BaseSession } from 'terminus-terminal'

export interface LoginScript {
    expect?: string
    send: string
}

export interface SSHConnection {
    name?: string
    host: string
    port: number
    user: string
    password?: string
    privateKey?: string
    group?: string
    scripts?: LoginScript[]
}

export class SSHSession extends BaseSession {
    scripts?: LoginScript[]

    constructor (private shell: any, conn: SSHConnection) {
        super()
        this.scripts = conn.scripts ? [...conn.scripts] : []
    }

    start () {
        this.open = true

        this.shell.on('data', data => {
            let dataString = data.toString()
            this.emitOutput(dataString)

            if (this.scripts && this.scripts.length > 0) {
                let found = false
                for (let i = 0; i < this.scripts.length; i++) {
                    if (dataString.indexOf(this.scripts[i].expect) >= 0) {
                        console.log("Executing: " + this.scripts[i].send)
                        this.shell.write(this.scripts[i].send + "\n")
                        this.scripts.splice(i, 1)
                        i--
                        found = true
                    }
                    else {
                        break;
                    }
                }

                if (found) {
                    this.executeScripts()
                }
            }
        })

        this.shell.on('end', () => {
            if (this.open) {
                this.destroy()
            }
        })

        this.executeScripts()
    }

    executeScripts () {
        if (this.scripts && this.scripts.length > 0) {
            for (let i = 0; i < this.scripts.length; i++) {
                if (!this.scripts[i].expect) {
                    console.log("Executing: " + this.scripts[i].send)
                    this.shell.write(this.scripts[i].send + "\n")
                    this.scripts.splice(i, 1)
                    i--
                }
                else {
                    break;
                }
            }
        }
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

export interface ISSHConnectionGroup {
    name: string
    connections: SSHConnection[]
}
