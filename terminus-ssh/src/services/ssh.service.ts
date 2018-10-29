import { Injectable, NgZone } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Client } from 'ssh2'
import * as fs from 'mz/fs'
import * as path from 'path'
import { ToastrService } from 'ngx-toastr'
import { AppService, HostAppService, Platform, Logger, LogService } from 'terminus-core'
import { TerminalTabComponent } from 'terminus-terminal'
import { SSHConnection, SSHSession } from '../api'
import { PromptModalComponent } from '../components/promptModal.component'
import { PasswordStorageService } from './passwordStorage.service'
const { SSH2Stream } = require('ssh2-streams')

@Injectable()
export class SSHService {
    private logger: Logger

    constructor (
        log: LogService,
        private app: AppService,
        private zone: NgZone,
        private ngbModal: NgbModal,
        private hostApp: HostAppService,
        private passwordStorage: PasswordStorageService,
        private toastr: ToastrService,
    ) {
        this.logger = log.create('ssh')
    }

    async connect (connection: SSHConnection): Promise<TerminalTabComponent> {
        let privateKey: string = null
        let privateKeyPassphrase: string = null
        let privateKeyPath = connection.privateKey
        if (!privateKeyPath) {
            let userKeyPath = path.join(process.env.HOME, '.ssh', 'id_rsa')
            if (await fs.exists(userKeyPath)) {
                this.logger.info('Using user\'s default private key:', userKeyPath)
                privateKeyPath = userKeyPath
            }
        }

        if (privateKeyPath) {
            try {
                privateKey = (await fs.readFile(privateKeyPath)).toString()
            } catch (error) {
                this.toastr.warning('Could not read the private key file')
            }

            if (privateKey) {
                this.logger.info('Loaded private key from', privateKeyPath)

                let encrypted = privateKey.includes('ENCRYPTED')
                if (privateKeyPath.toLowerCase().endsWith('.ppk')) {
                    encrypted = encrypted || privateKey.includes('Encryption:') && !privateKey.includes('Encryption: none')
                }
                if (encrypted) {
                    let modal = this.ngbModal.open(PromptModalComponent)
                    modal.componentInstance.prompt = 'Private key passphrase'
                    modal.componentInstance.password = true
                    try {
                        privateKeyPassphrase = await modal.result
                    } catch (_err) { } // tslint:disable-line
                }
            }
        }

        let ssh = new Client()
        let connected = false
        let savedPassword: string = null
        await new Promise((resolve, reject) => {
            ssh.on('ready', () => {
                connected = true
                if (savedPassword) {
                    this.passwordStorage.savePassword(connection, savedPassword)
                }
                this.zone.run(resolve)
            })
            ssh.on('error', error => {
                this.passwordStorage.deletePassword(connection)
                this.zone.run(() => {
                    if (connected) {
                        this.toastr.error(error.toString())
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

            let agent: string = null
            if (this.hostApp.platform === Platform.Windows) {
                agent = 'pageant'
            } else {
                agent = process.env.SSH_AUTH_SOCK
            }

            ssh.connect({
                host: connection.host,
                port: connection.port || 22,
                username: connection.user,
                password: connection.privateKey ? undefined : '',
                privateKey,
                passphrase: privateKeyPassphrase,
                tryKeyboard: true,
                agent,
                agentForward: !!agent,
                keepaliveInterval: connection.keepaliveInterval,
                keepaliveCountMax: connection.keepaliveCountMax,
                readyTimeout: connection.readyTimeout,
            })

            let keychainPasswordUsed = false

            ;(ssh as any).config.password = () => this.zone.run(async () => {
                if (connection.password) {
                    this.logger.info('Using preset password')
                    return connection.password
                }

                if (!keychainPasswordUsed) {
                    let password = await this.passwordStorage.loadPassword(connection)
                    if (password) {
                        this.logger.info('Using saved password')
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

            let session = new SSHSession(shell, connection)

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
