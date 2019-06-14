import { BaseSession } from 'terminus-terminal'

export interface LoginScript {
    expect?: string
    send: string
    isRegex?: boolean
    optional?: boolean
}

export enum SSHAlgorithmType {
    HMAC = 'hmac',
    KEX = 'kex',
    CIPHER = 'cipher',
    HOSTKEY = 'serverHostKey'
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

    algorithms?: {[t: string]: string[]}
}

export class SSHSession extends BaseSession {
    scripts?: LoginScript[]
    shell: any

    constructor (public connection: SSHConnection) {
        super()
        this.scripts = connection.scripts || []
    }

    start () {
        this.open = true

        this.shell.on('data', data => {
            const dataString = data.toString()
            this.emitOutput(dataString)

            if (this.scripts) {
                let found = false
                for (const script of this.scripts) {
                    let match = false
                    let cmd = ''
                    if (script.isRegex) {
                        const re = new RegExp(script.expect, 'g')
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
        if (this.shell) {
            this.shell.setWindow(rows, columns)
        }
    }

    write (data) {
        if (this.shell) {
            this.shell.write(data)
        }
    }

    kill (signal?: string) {
        if (this.shell) {
            this.shell.signal(signal || 'TERM')
        }
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
            for (const script of this.scripts) {
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

export interface SSHConnectionGroup {
    name: string
    connections: SSHConnection[]
}
