import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import colors from 'ansi-colors'
import { Component, Injector, HostListener } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { first } from 'rxjs'
import { GetRecoveryTokenOptions, Platform, ProfilesService, RecoveryToken } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { SSHService } from '../services/ssh.service'
import { KeyboardInteractivePrompt, SSHSession } from '../session/ssh'
import { SSHPortForwardingModalComponent } from './sshPortForwardingModal.component'
import { SSHProfile } from '../api'
import { SSHShellSession } from '../session/shell'
import { SSHMultiplexerService } from '../services/sshMultiplexer.service'

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
    sshSession: SSHSession|null = null
    session: SSHShellSession|null = null
    sftpPanelVisible = false
    sftpPath = '/'
    enableToolbar = true
    activeKIPrompt: KeyboardInteractivePrompt|null = null
    private recentInputs = ''
    private reconnectOffered = false

    constructor (
        injector: Injector,
        public ssh: SSHService,
        private ngbModal: NgbModal,
        private profilesService: ProfilesService,
        private sshMultiplexer: SSHMultiplexerService,
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
                    if (this.sshSession) {
                        this.ssh.launchWinSCP(this.sshSession)
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

    async setupOneSession (injector: Injector, profile: SSHProfile): Promise<SSHSession> {
        let session = await this.sshMultiplexer.getSession(profile)
        if (!session || !profile.options.reuseSession) {
            session = new SSHSession(injector, profile)

            if (profile.options.jumpHost) {
                const jumpConnection = (await this.profilesService.getProfiles()).find(x => x.id === profile.options.jumpHost)

                if (!jumpConnection) {
                    throw new Error(`${profile.options.host}: jump host "${profile.options.jumpHost}" not found in your config`)
                }

                const jumpSession = await this.setupOneSession(
                    this.injector,
                    this.profilesService.getConfigProxyForProfile(jumpConnection)
                )

                jumpSession.ref()
                session.willDestroy$.subscribe(() => jumpSession.unref())
                jumpSession.willDestroy$.subscribe(() => {
                    if (session?.open) {
                        session.destroy()
                    }
                })

                session.jumpStream = await new Promise((resolve, reject) => jumpSession.ssh.forwardOut(
                    '127.0.0.1', 0, profile.options.host, profile.options.port ?? 22,
                    (err, stream) => {
                        if (err) {
                            jumpSession.emitServiceMessage(colors.bgRed.black(' X ') + ` Could not set up port forward on ${jumpConnection.name}`)
                            reject(err)
                            return
                        }
                        resolve(stream)
                    }
                ))
            }
        }

        this.attachSessionHandler(session.serviceMessage$, msg => {
            msg = msg.replace(/\n/g, '\r\n      ')
            this.write(`\r${colors.black.bgWhite(' SSH ')} ${msg}\r\n`)
        })

        this.attachSessionHandler(session.willDestroy$, () => {
            this.activeKIPrompt = null
        })

        this.attachSessionHandler(session.keyboardInteractivePrompt$, prompt => {
            this.activeKIPrompt = prompt
            setTimeout(() => {
                this.frontend?.scrollToBottom()
            })
        })

        if (!session.open) {
            this.write('\r\n' + colors.black.bgWhite(' SSH ') + ` Connecting to ${session.profile.options.host}\r\n`)

            this.startSpinner(this.translate.instant(_('Connecting')))

            try {
                await session.start()
                this.stopSpinner()
            } catch (e) {
                this.stopSpinner()
                this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
                return session
            }

            this.sshMultiplexer.addSession(session)
        }

        return session
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
                this.write('\r\n' + colors.black.bgWhite(' SSH ') + ` ${this.sshSession?.profile.options.host}: session closed\r\n`)
                if (!this.reconnectOffered) {
                    this.reconnectOffered = true
                    this.write(this.translate.instant(_('Press any key to reconnect')) + '\r\n')
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

        try {
            this.sshSession = await this.setupOneSession(this.injector, this.profile)
        } catch (e) {
            this.write(colors.black.bgRed(' X ') + ' ' + colors.red(e.message) + '\r\n')
            return
        }

        const session = new SSHShellSession(this.injector, this.sshSession)
        this.setSession(session)
        this.attachSessionHandler(session.serviceMessage$, msg => {
            msg = msg.replace(/\n/g, '\r\n      ')
            this.write(`\r${colors.black.bgWhite(' SSH ')} ${msg}\r\n`)
            session.resize(this.size.columns, this.size.rows)
        })

        await session.start()
        this.session?.resize(this.size.columns, this.size.rows)
    }

    async getRecoveryToken (options?: GetRecoveryTokenOptions): Promise<RecoveryToken> {
        return {
            type: 'app:ssh-tab',
            profile: this.profile,
            savedState: options?.includeState && this.frontend?.saveState(),
        }
    }

    showPortForwarding (): void {
        const modal = this.ngbModal.open(SSHPortForwardingModalComponent).componentInstance as SSHPortForwardingModalComponent
        modal.session = this.sshSession!
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
                message: this.translate.instant(_('Disconnect from {host}?'), this.profile?.options),
                buttons: [
                    this.translate.instant(_('Disconnect')),
                    this.translate.instant(_('Do not close')),
                ],
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
