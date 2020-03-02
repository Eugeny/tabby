import colors from 'ansi-colors'
import { open as openTemp } from 'temp'
import { Injectable, NgZone } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Client } from 'ssh2'
import * as fs from 'mz/fs'
import { execFile } from 'mz/child_process'
import * as path from 'path'
import * as sshpk from 'sshpk'
import { ToastrService } from 'ngx-toastr'
import { HostAppService, Platform, Logger, LogService, ElectronService } from 'terminus-core'
import { SSHConnection, SSHSession } from '../api'
import { PromptModalComponent } from '../components/promptModal.component'
import { PasswordStorageService } from './passwordStorage.service'
import { SSH2Stream } from 'ssh2-streams'

try {
    var windowsProcessTreeNative = require('windows-process-tree/build/Release/windows_process_tree.node') // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

@Injectable({ providedIn: 'root' })
export class SSHService {
    private logger: Logger

    private constructor (
        private log: LogService,
        private electron: ElectronService,
        private zone: NgZone,
        private ngbModal: NgbModal,
        private hostApp: HostAppService,
        private passwordStorage: PasswordStorageService,
        private toastr: ToastrService,
    ) {
        this.logger = log.create('ssh')
    }

    createSession (connection: SSHConnection): SSHSession {
        const session = new SSHSession(connection)
        session.logger = this.log.create(`ssh-${connection.host}-${connection.port}`)
        return session
    }

    async connectSession (session: SSHSession, logCallback?: (s: any) => void): Promise<void> {
        let privateKey: string|null = null
        let privateKeyPath = session.connection.privateKey

        if (!logCallback) {
            logCallback = () => null
        }

        const log = (s: any) => {
            logCallback!(s)
            this.logger.info(s)
        }

        if (!privateKeyPath) {
            const userKeyPath = path.join(process.env.HOME as string, '.ssh', 'id_rsa')
            if (await fs.exists(userKeyPath)) {
                log('Using user\'s default private key')
                privateKeyPath = userKeyPath
            }
        }

        if (privateKeyPath) {
            log('Loading private key from ' + colors.bgWhite.blackBright(' ' + privateKeyPath + ' '))
            try {
                privateKey = (await fs.readFile(privateKeyPath)).toString()
            } catch (error) {
                log(colors.bgRed.black(' X ') + 'Could not read the private key file')
                this.toastr.error('Could not read the private key file')
            }

            if (privateKey) {
                let parsedKey: any = null
                try {
                    parsedKey = sshpk.parsePrivateKey(privateKey, 'auto')
                } catch (e) {
                    if (e instanceof sshpk.KeyEncryptedError) {
                        const modal = this.ngbModal.open(PromptModalComponent)
                        log(colors.bgYellow.yellow.black(' ! ') + ' Key requires passphrase')
                        modal.componentInstance.prompt = 'Private key passphrase'
                        modal.componentInstance.password = true
                        let passphrase = ''
                        try {
                            const result  = await modal.result
                            passphrase = result?.value
                        } catch (e) { }
                        parsedKey = sshpk.parsePrivateKey(
                            privateKey,
                            'auto',
                            { passphrase: passphrase }
                        )
                    } else {
                        throw e
                    }
                }

                const sshFormatKey = parsedKey!.toString('openssh')
                const temp = await openTemp()
                fs.close(temp.fd)
                await fs.writeFile(temp.path, sshFormatKey)

                let sshKeygenPath = 'ssh-keygen'
                if (this.hostApp.platform === Platform.Windows) {
                    sshKeygenPath = path.join(
                        path.dirname(this.electron.app.getPath('exe')),
                        'resources',
                        'extras',
                        'ssh-keygen',
                        'ssh-keygen.exe',
                    )
                    await execFile('icacls', [temp.path, '/inheritance:r'])
                    await execFile('icacls', [temp.path, '/grant:r', `${process.env.USERNAME}:(R,W)`])
                }

                await execFile(sshKeygenPath, [
                    '-p', '-P', '', '-N', '', '-m', 'PEM', '-f',
                    temp.path,
                ])

                privateKey = await fs.readFile(temp.path, { encoding: 'utf-8' })
                fs.unlink(temp.path)
            }
        }

        const ssh = new Client()
        session.ssh = ssh
        let connected = false
        let savedPassword: string|null = null
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
                log(colors.bgBlackBright(' ') + ` Keyboard-interactive auth requested: ${name}`)
                this.logger.info('Keyboard-interactive auth:', name, instructions, instructionsLang)
                const results: string[] = []
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
                if (!session.connection.skipBanner) {
                    log('Greeting: ' + greeting)
                }
            })

            ssh.on('banner', banner => {
                if (!session.connection.skipBanner) {
                    log(banner)
                }
            })

            let agent: string|null = null
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
                agent = process.env.SSH_AUTH_SOCK as string
            }

            try {
                ssh.connect({
                    host: session.connection.host,
                    port: session.connection.port || 22,
                    username: session.connection.user,
                    password: session.connection.privateKey ? undefined : '',
                    privateKey: privateKey || undefined,
                    tryKeyboard: true,
                    agent: agent || undefined,
                    agentForward: !!agent,
                    keepaliveInterval: session.connection.keepaliveInterval,
                    keepaliveCountMax: session.connection.keepaliveCountMax,
                    readyTimeout: session.connection.readyTimeout,
                    hostVerifier: digest => {
                        log(colors.bgWhite(' ') + ' Host key fingerprint:')
                        log(colors.bgWhite(' ') + ' ' + colors.black.bgWhite(' SHA256 ') + colors.bgBlackBright(' ' + digest + ' '))
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
    }
}

/* eslint-disable */
const _authPassword = SSH2Stream.prototype.authPassword
SSH2Stream.prototype.authPassword = async function (username, passwordFn: any) {
    _authPassword.bind(this)(username, await passwordFn())
} as any
