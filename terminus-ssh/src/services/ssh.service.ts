import { Injectable, NgZone } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Client } from 'ssh2'
import * as fs from 'mz/fs'
import { AppService } from 'terminus-core'
import { TerminalTabComponent } from 'terminus-terminal'
import { SSHConnection, SSHSession } from '../api'
import { PromptModalComponent } from '../components/promptModal.component'

const { SSH2Stream } = require('ssh2-streams')
const keychain = require('xkeychain')

@Injectable()
export class SSHService {
    constructor (
        private app: AppService,
        private zone: NgZone,
        private ngbModal: NgbModal,
    ) {
    }

    async connect (connection: SSHConnection): Promise<TerminalTabComponent> {
        let privateKey: string = null
        if (connection.privateKey) {
            try {
                privateKey = (await fs.readFile(connection.privateKey)).toString()
            } catch (error) {
            }
        }

        let ssh = new Client()
        let connected = false
        await new Promise((resolve, reject) => {
            ssh.on('ready', () => {
                connected = true
                this.zone.run(resolve)
            })
            ssh.on('error', error => {
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

                if (!keychainPasswordUsed && keychain.isSupported()) {
                    let password = await new Promise(resolve => {
                        keychain.getPassword({
                            account: connection.user,
                            service: `ssh@${connection.host}`,
                        }, (_, result) => resolve(result))
                    })
                    if (password) {
                        keychainPasswordUsed = true
                        return password
                    }
                }

                let modal = this.ngbModal.open(PromptModalComponent)
                modal.componentInstance.prompt = `Password for ${connection.user}@${connection.host}`
                modal.componentInstance.password = true
                let password =  await modal.result

                keychain.setPassword({
                    account: connection.user,
                    service: `ssh@${connection.host}`,
                    password
                }, () => null)

                return password
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
