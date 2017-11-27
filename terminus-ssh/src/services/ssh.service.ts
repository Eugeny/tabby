import { Injectable, NgZone } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Client } from 'ssh2'
import * as fs from 'mz/fs'
import { AppService } from 'terminus-core'
import { TerminalTabComponent } from 'terminus-terminal'
import { SSHConnection, SSHSession } from '../api'
import { PromptModalComponent } from '../components/promptModal.component'

const { SSH2Stream } = require('ssh2-streams')

let xkeychain
let wincredmgr
try {
    console.log(1)
    xkeychain = require('xkeychain')
} catch (error) {
    try {
        wincredmgr = require('wincredmgr')
    } catch (error2) {
        console.warn('No keychain manager available')
    }
}

@Injectable()
export class SSHService {
    constructor (
        private app: AppService,
        private zone: NgZone,
        private ngbModal: NgbModal,
    ) {
    }

    savePassword (connection: SSHConnection, password: string) {
        if (xkeychain) {
            xkeychain.setPassword({
                account: connection.user,
                service: `ssh@${connection.host}`,
                password
            }, () => null)
        } else {
            wincredmgr.WriteCredentials(
                'user',
                password,
                `ssh:${connection.user}@${connection.host}`,
            )
        }
    }

    deletePassword (connection: SSHConnection) {
        if (xkeychain) {
            xkeychain.deletePassword({
                account: connection.user,
                service: `ssh@${connection.host}`,
            }, () => null)
        } else {
            wincredmgr.DeleteCredentials(
                `ssh:${connection.user}@${connection.host}`,
            )
        }
    }

    loadPassword (connection: SSHConnection): Promise<string> {
        return new Promise(resolve => {
            if (xkeychain) {
                xkeychain.getPassword({
                    account: connection.user,
                    service: `ssh@${connection.host}`,
                }, (_, result) => resolve(result))
            } else {
                try {
                    resolve(wincredmgr.ReadCredentials(`ssh:${connection.user}@${connection.host}`).password)
                } catch (error) {
                    resolve(null)
                }
            }
        })
    }

    async connect (connection: SSHConnection): Promise<TerminalTabComponent> {
        let privateKey: string = null
        if (connection.privateKey) {
            try {
                privateKey = (await fs.readFile(connection.privateKey)).toString()
            } catch (error) { }
        }

        let ssh = new Client()
        let connected = false
        let savedPassword: string = null
        await new Promise((resolve, reject) => {
            ssh.on('ready', () => {
                connected = true
                this.savePassword(connection, savedPassword)
                this.zone.run(resolve)
            })
            ssh.on('error', error => {
                this.deletePassword(connection)
                this.zone.run(() => {
                    if (connected) {
                        alert(`SSH error: ${error}`)
                    } else {
                        reject(error)
                    }
                })
            })
            ssh.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => this.zone.run(async () => {
                console.log(name, instructions, instructionsLang)
                let results = []
                for (let prompt of prompts) {
                    let modal = this.ngbModal.open(PromptModalComponent)
                    modal.componentInstance.prompt = prompt.prompt
                    modal.componentInstance.password = !prompt.echo
                    results.push(await modal.result)
                }
                finish(results)
            }))
            ssh.connect({
                host: connection.host,
                username: connection.user,
                password: privateKey ? undefined : '',
                privateKey,
                tryKeyboard: true,
            })

            let keychainPasswordUsed = false

            ;(ssh as any).config.password = () => this.zone.run(async () => {
                if (connection.password) {
                    return connection.password
                }

                if (!keychainPasswordUsed && (wincredmgr || xkeychain.isSupported())) {
                    let password = await this.loadPassword(connection)
                    if (password) {
                        keychainPasswordUsed = true
                        return password
                    }
                }

                let modal = this.ngbModal.open(PromptModalComponent)
                modal.componentInstance.prompt = `Password for ${connection.user}@${connection.host}`
                modal.componentInstance.password = true
                savedPassword = await modal.result
                return savedPassword
            })
        })

        try {
            let shell = await new Promise((resolve, reject) => {
                ssh.shell({ term: 'xterm-256color' }, (err, shell) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(shell)
                    }
                })
            })

            let session = new SSHSession(shell)

            return this.zone.run(() => this.app.openNewTab(
                TerminalTabComponent,
                { session, sessionOptions: {} }
            ) as TerminalTabComponent)
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}

const _authPassword = SSH2Stream.prototype.authPassword
SSH2Stream.prototype.authPassword = async function (username, passwordFn) {
    _authPassword.bind(this)(username, await passwordFn())
}
