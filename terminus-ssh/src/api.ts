import { BaseSession } from 'terminus-terminal'

export interface LoginScript {
    expect?: string
    send: string
    isRegex?: boolean
    optional?: boolean
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
    keepaliveInterval?: number
    keepaliveCountMax?: number
    readyTimeout?: number
}

export class SSHSession extends BaseSession {
    scripts?: LoginScript[]

    constructor (private shell: any, conn: SSHConnection) {
        super()
        this.scripts = conn.scripts || []
    }

    start () {
        this.open = true

        this.shell.on('data', data => {
            let dataString = data.toString()
            this.emitOutput(dataString)

            if (this.scripts) {
                let found = false
                for (let script of this.scripts) {
                    let match = false
                    let cmd = ''
                    if (script.isRegex) {
                        let re = new RegExp(script.expect, 'g')
                        if (dataString.match(re)) {
                            cmd = dataString.replace(re, script.send)
                            match = true
                            found = true
                        }
                    } else {
                        if (dataString.includes(script.expect)) {
                            cmd = script.send
                            match = true
                            found = true
                        }
                    }

                    if (match) {
                        console.log('Executing script: "' + cmd + '"')
                        this.shell.write(cmd + '\n')
                        this.scripts = this.scripts.filter(x => x !== script)
                    } else {
                        if (script.optional) {
                            console.log('Skip optional script: ' + script.expect)
                            found = true
                            this.scripts = this.scripts.filter(x => x !== script)
                        } else {
                            break
                        }
                    }
                }

                if (found) {
                    this.executeUnconditionalScripts()
                }
            }
        })

        this.shell.on('end', () => {
            if (this.open) {
                this.destroy()
            }
        })

        this.executeUnconditionalScripts()
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

    private executeUnconditionalScripts () {
        if (this.scripts) {
            for (let script of this.scripts) {
                if (!script.expect) {
                    console.log('Executing script:', script.send)
                    this.shell.write(script.send + '\n')
                    this.scripts = this.scripts.filter(x => x !== script)
                } else {
                    break
                }
            }
        }
    }
}

export interface ISSHConnectionGroup {
    name: string
    connections: SSHConnection[]
}
