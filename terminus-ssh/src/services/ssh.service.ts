import { Injectable, NgZone } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Client } from 'ssh2'
import * as fs from 'mz/fs'
import * as path from 'path'
import { ToastrService } from 'ngx-toastr'
import { AppService, HostAppService, Platform, Logger, LogService } from 'terminus-core'
import { SSHConnection, SSHSession } from '../api'
import { PromptModalComponent } from '../components/promptModal.component'
import { SSHTabComponent } from '../components/sshTab.component'
import { PasswordStorageService } from './passwordStorage.service'
import { SSH2Stream } from 'ssh2-streams'

try {
    var windowsProcessTreeNative = require('windows-process-tree/build/Release/windows_process_tree.node') // eslint-disable-line @typescript-eslint/no-var-requires
} catch { }

@Injectable({ providedIn: 'root' })
export class SSHService {
    private logger: Logger

    private constructor (
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

    async openTab (connection: SSHConnection): Promise<SSHTabComponent> {
        return this.zone.run(() => this.app.openNewTab(
            SSHTabComponent,
            { connection }
        ) as SSHTabComponent)
    }

    async connectSession (session: SSHSession, logCallback?: (s: string) => void): Promise<void> {
        let privateKey: string = null
        let privateKeyPassphrase: string = null
        let privateKeyPath = session.connection.privateKey

        if (!logCallback) {
            logCallback = () => null
        }

        const log = (s: any) => {
            logCallback(s)
            this.logger.info(s)
        }

        if (!privateKeyPath) {
            const userKeyPath = path.join(process.env.HOME, '.ssh', 'id_rsa')
            if (await fs.exists(userKeyPath)) {
                log(`Using user's default private key: ${userKeyPath}`)
                privateKeyPath = userKeyPath
            }
        }

        if (privateKeyPath) {
            try {
                privateKey = (await fs.readFile(privateKeyPath)).toString()
            } catch (error) {
                log('Could not read the private key file')
                this.toastr.error('Could not read the private key file')
            }

            if (privateKey) {
                log(`Loading private key from ${privateKeyPath}`)

                let encrypted = privateKey.includes('ENCRYPTED')
                if (privateKeyPath.toLowerCase().endsWith('.ppk')) {
                    encrypted = encrypted || privateKey.includes('Encryption:') && !privateKey.includes('Encryption: none')
                }
                if (encrypted) {
                    const modal = this.ngbModal.open(PromptModalComponent)
                    log('Key requires passphrase')
                    modal.componentInstance.prompt = 'Private key passphrase'
                    modal.componentInstance.password = true
                    try {
                        const result  = await modal.result
                        if (result) {
                            privateKeyPassphrase = result.value
                        }
                    } catch (e) { }
                }
            }
        }

        const ssh = new Client()
        let connected = false
        let savedPassword: string = null
        await new Promise(async (resolve, reject) => {
            ssh.on('ready', () => {
                connected = true
                if (savedPassword) {
                    this.passwordStorage.savePassword(session.connection, savedPassword)
                }
                this.zone.run(resolve)
            })
            ssh.on('error', error => {
                if (error.message === 'All configured authentication methods failed') {
                    this.passwordStorage.deletePassword(session.connection)
                }
                this.zone.run(() => {
                    if (connected) {
                        this.toastr.error(error.toString())
                    } else {
                        reject(error)
                    }
                })
            })
            ssh.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => this.zone.run(async () => {
                log(`Keyboard-interactive auth requested: ${name}`)
                this.logger.info('Keyboard-interactive auth:', name, instructions, instructionsLang)
                const results = []
                for (const prompt of prompts) {
                    const modal = this.ngbModal.open(PromptModalComponent)
                    modal.componentInstance.prompt = prompt.prompt
                    modal.componentInstance.password = !prompt.echo
                    const result = await modal.result
                    results.push(result ? result.value : '')
                }
                finish(results)
            }))

            ssh.on('greeting', greeting => {
                log('Greeting: ' + greeting)
            })

            ssh.on('banner', banner => {
                log('Banner: \n' + banner)
            })

            let agent: string = null
            if (this.hostApp.platform === Platform.Windows) {
                const pageantRunning = new Promise<boolean>(resolve => {
                    windowsProcessTreeNative.getProcessList(list => { // eslint-disable-line block-scoped-var
                        resolve(list.some(x => x.name === 'pageant.exe'))
                    }, 0)
                })
                if (await pageantRunning) {
                    agent = 'pageant'
                }
            } else {
                agent = process.env.SSH_AUTH_SOCK
            }

            try {
                ssh.connect({
                    host: session.connection.host,
                    port: session.connection.port || 22,
                    username: session.connection.user,
                    password: session.connection.privateKey ? undefined : '',
                    privateKey,
                    passphrase: privateKeyPassphrase,
                    tryKeyboard: true,
                    agent,
                    agentForward: !!agent,
                    keepaliveInterval: session.connection.keepaliveInterval,
                    keepaliveCountMax: session.connection.keepaliveCountMax,
                    readyTimeout: session.connection.readyTimeout,
                    hostVerifier: digest => {
                        log('SHA256 fingerprint: ' + digest)
                        return true
                    },
                    hostHash: 'sha256' as any,
                    algorithms: session.connection.algorithms,
                })
            } catch (e) {
                this.toastr.error(e.message)
                reject(e)
            }

            let keychainPasswordUsed = false

            ;(ssh as any).config.password = () => this.zone.run(async () => {
                if (session.connection.password) {
                    log('Using preset password')
                    return session.connection.password
                }

                if (!keychainPasswordUsed) {
                    const password = await this.passwordStorage.loadPassword(session.connection)
                    if (password) {
                        log('Trying saved password')
                        keychainPasswordUsed = true
                        return password
                    }
                }

                const modal = this.ngbModal.open(PromptModalComponent)
                modal.componentInstance.prompt = `Password for ${session.connection.user}@${session.connection.host}`
                modal.componentInstance.password = true
                modal.componentInstance.showRememberCheckbox = true
                try {
                    const result = await modal.result
                    if (result) {
                        if (result.remember) {
                            savedPassword = result.value
                        }
                        return result.value
                    }
                    return ''
                } catch (_) {
                    return ''
                }
            })
        })

        try {
            const shell: any = await new Promise<any>((resolve, reject) => {
                ssh.shell({ term: 'xterm-256color' }, (err, shell) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(shell)
                    }
                })
            })

            session.shell = shell

            shell.on('greeting', greeting => {
                log(`Shell Greeting: ${greeting}`)
            })

            shell.on('banner', banner => {
                log(`Shell Banner: ${banner}`)
            })
        } catch (error) {
            this.toastr.error(error.message)
            throw error
        }
    }
}

/* eslint-disable */
const _authPassword = SSH2Stream.prototype.authPassword
SSH2Stream.prototype.authPassword = async function (username, passwordFn: any) {
    _authPassword.bind(this)(username, await passwordFn())
} as any
