import colors from 'ansi-colors'
import { Component, Injector, HostListener } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { first } from 'rxjs'
import { PartialProfile, Platform, ProfilesService, RecoveryToken } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { SSHService } from '../services/ssh.service'
import { KeyboardInteractivePrompt, SSHSession } from '../session/ssh'
import { SSHPortForwardingModalComponent } from './sshPortForwardingModal.component'
import { SSHProfile } from '../api'


/** @hidden */
@Component({
    selector: 'ssh-tab',
    template: `${BaseTerminalTabComponent.template} ${require('./sshTab.component.pug')}`,
    styles: [require('./sshTab.component.scss'), ...BaseTerminalTabComponent.styles],
    animations: BaseTerminalTabComponent.animations,
})
export class SSHTabComponent extends BaseTerminalTabComponent {
    Platform = Platform
    profile?: SSHProfile
    session: SSHSession|null = null
    sftpPanelVisible = false
    sftpPath = '/'
    enableToolbar = true
    activeKIPrompt: KeyboardInteractivePrompt|null = null
    private sessionStack: SSHSession[] = []
    private recentInputs = ''
    private reconnectOffered = false

    constructor (
        injector: Injector,
        public ssh: SSHService,
        private ngbModal: NgbModal,
        private profilesService: ProfilesService,
    ) {
        super(injector)
        this.sessionChanged$.subscribe(() => {
            this.activeKIPrompt = null
        })
    }

    ngOnInit (): void {
        if (!this.profile) {
            throw new Error('Profile not set')
        }

        this.logger = this.log.create('terminalTab')

        this.subscribeUntilDestroyed(this.hotkeys.hotkey$, hotkey => {
            if (!this.hasFocus) {
                return
            }
            switch (hotkey) {
                case 'home':
                    this.sendInput('\x1bOH' )
                    break
                case 'end':
                    this.sendInput('\x1bOF' )
                    break
                case 'restart-ssh-session':
                    this.reconnect()
                    break
                case 'launch-winscp':
                    if (this.session) {
                        this.ssh.launchWinSCP(this.session)
                    }
                    break
            }
        })

        this.frontendReady$.pipe(first()).subscribe(() => {
            this.initializeSession()
            this.input$.subscribe(data => {
                this.recentInputs += data
                this.recentInputs = this.recentInputs.substring(this.recentInputs.length - 32)
            })
        })

        super.ngOnInit()
    }

    async setupOneSession (session: SSHSession, interactive: boolean): Promise<void> {
        if (session.profile.options.jumpHost) {
            const jumpConnection: PartialProfile<SSHProfile>|null = this.config.store.profiles.find(x => x.id === session.profile.options.jumpHost)

            if (!jumpConnection) {
                throw new Error(`${session.profile.options.host}: jump host "${session.profile.options.jumpHost}" not found in your config`)
            }

            const jumpSession = new SSHSession(
                this.injector,
                this.profilesService.getConfigProxyForProfile(jumpConnection)
            )

            await this.setupOneSession(jumpSession, false)

            this.attachSessionHandler(jumpSession.destroyed$, () => {
                if (session.open) {
                    session.destroy()
                }
            })

            session.jumpStream = await new Promise((resolve, reject) => jumpSession.ssh.forwardOut(
                '127.0.0.1', 0, session.profile.options.host, session.profile.options.port ?? 22,
                (err, stream) => {
                    if (err) {
                        jumpSession.emitServiceMessage(colors.bgRed.black(' X ') + ` Could not set up port forward on ${jumpConnection.name}`)
                        reject(err)
                        return
                    }
                    resolve(stream)
                }
            ))

            session.jumpStream.on('close', () => {
                jumpSession.destroy()
            })

            this.sessionStack.push(session)
        }

        this.write('\r\n' + colors.black.bgWhite(' SSH ') + ` Connecting to ${session.profile.options.host}\r\n`)

        this.startSpinner('Connecting')

        this.attachSessionHandler(session.serviceMessage$, msg => {
            this.write(`\r${colors.black.bgWhite(' SSH ')} ${msg}\r\n`)
            session.resize(this.size.columns, this.size.rows)
        })

        this.attachSessionHandler(session.destroyed$, () => {
            this.activeKIPrompt = null
        })

        this.attachSessionHandler(session.keyboardInteractivePrompt$, prompt => {
            this.activeKIPrompt = prompt
            setTimeout(() => {
                this.frontend?.scrollToBottom()
            })
        })

        try {
            await session.start(interactive)
            this.stopSpinner()
        } catch (e) {
            this.stopSpinner()
            this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
            return
        }
    }

    protected attachSessionHandlers (): void {
        const session = this.session!
        this.attachSessionHandler(session.destroyed$, () => {
            if (
                // Ctrl-D
                this.recentInputs.charCodeAt(this.recentInputs.length - 1) === 4 ||
                this.recentInputs.endsWith('exit\r')
            ) {
                // User closed the session
                this.destroy()
            } else if (this.frontend) {
                // Session was closed abruptly
                this.write('\r\n' + colors.black.bgWhite(' SSH ') + ` ${session.profile.options.host}: session closed\r\n`)
                if (!this.reconnectOffered) {
                    this.reconnectOffered = true
                    this.write('Press any key to reconnect\r\n')
                    this.input$.pipe(first()).subscribe(() => {
                        if (!this.session?.open && this.reconnectOffered) {
                            this.reconnect()
                        }
                    })
                }
            }
        })
        super.attachSessionHandlers()
    }

    async initializeSession (): Promise<void> {
        this.reconnectOffered = false
        if (!this.profile) {
            this.logger.error('No SSH connection info supplied')
            return
        }

        const session = new SSHSession(this.injector, this.profile)
        this.setSession(session)

        try {
            await this.setupOneSession(session, true)
        } catch (e) {
            this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
        }

        this.session!.resize(this.size.columns, this.size.rows)
    }

    async getRecoveryToken (): Promise<RecoveryToken> {
        return {
            type: 'app:ssh-tab',
            profile: this.profile,
            savedState: this.frontend?.saveState(),
        }
    }

    showPortForwarding (): void {
        const modal = this.ngbModal.open(SSHPortForwardingModalComponent).componentInstance as SSHPortForwardingModalComponent
        modal.session = this.session!
    }

    async reconnect (): Promise<void> {
        this.session?.destroy()
        await this.initializeSession()
        this.session?.releaseInitialDataBuffer()
    }

    async canClose (): Promise<boolean> {
        if (!this.session?.open) {
            return true
        }
        if (!(this.profile?.options.warnOnClose ?? this.config.store.ssh.warnOnClose)) {
            return true
        }
        return (await this.platform.showMessageBox(
            {
                type: 'warning',
                message: `Disconnect from ${this.profile?.options.host}?`,
                buttons: ['Disconnect', 'Do not close'],
                defaultId: 0,
                cancelId: 1,
            }
        )).response === 0
    }

    async openSFTP (): Promise<void> {
        this.sftpPath = await this.session?.getWorkingDirectory() ?? this.sftpPath
        setTimeout(() => {
            this.sftpPanelVisible = true
        }, 100)
    }

    @HostListener('click')
    onClick (): void {
        this.sftpPanelVisible = false
    }
}
