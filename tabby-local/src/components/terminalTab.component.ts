import { Component, Input, Injector } from '@angular/core'
import { BaseTabProcess, WIN_BUILD_CONPTY_SUPPORTED, isWindowsBuild } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { LocalProfile, SessionOptions } from '../api'
import { Session } from '../session'
import { UACService } from '../services/uac.service'

/** @hidden */
@Component({
    selector: 'terminalTab',
    template: BaseTerminalTabComponent.template,
    styles: BaseTerminalTabComponent.styles,
    animations: BaseTerminalTabComponent.animations,
})
export class TerminalTabComponent extends BaseTerminalTabComponent {
    @Input() sessionOptions: SessionOptions // Deprecated
    @Input() profile: LocalProfile
    session: Session|null = null

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        injector: Injector,
        private uac: UACService,
    ) {
        super(injector)
    }

    ngOnInit (): void {
        this.sessionOptions = this.profile.options

        this.logger = this.log.create('terminalTab')
        this.session = new Session(this.injector)

        const isConPTY = isWindowsBuild(WIN_BUILD_CONPTY_SUPPORTED) && this.config.store.terminal.useConPTY

        this.subscribeUntilDestroyed(this.hotkeys.hotkey$, hotkey => {
            if (!this.hasFocus) {
                return
            }
            switch (hotkey) {
                case 'home':
                    this.sendInput(isConPTY ? '\x1b[H' : '\x1bOH')
                    break
                case 'end':
                    this.sendInput(isConPTY ? '\x1b[F' : '\x1bOF')
                    break
            }
        })

        super.ngOnInit()
    }

    protected onFrontendReady (): void {
        this.initializeSession(this.size.columns, this.size.rows)
        this.savedStateIsLive = this.profile.options.restoreFromPTYID === this.session?.getPTYID()
        super.onFrontendReady()
    }

    initializeSession (columns: number, rows: number): void {
        if (this.profile.options.runAsAdministrator && this.uac.isAvailable) {
            this.profile.options = this.uac.patchSessionOptionsForUAC(this.profile.options)
        }

        this.session!.start({
            ...this.profile.options,
            width: columns,
            height: rows,
        })

        this.attachSessionHandlers(true)
        this.recoveryStateChangedHint.next()
    }

    async getRecoveryToken (): Promise<any> {
        const cwd = this.session ? await this.session.getWorkingDirectory() : null
        return {
            type: 'app:local-tab',
            profile: {
                ...this.profile,
                options: {
                    ...this.profile.options,
                    cwd: cwd ?? this.profile.options.cwd,
                    restoreFromPTYID: this.session?.getPTYID(),
                },
            },
            savedState: this.frontend?.saveState(),
        }
    }

    async getCurrentProcess (): Promise<BaseTabProcess|null> {
        const children = await this.session?.getChildProcesses()
        if (!children?.length) {
            return null
        }
        return {
            name: children[0].command,
        }
    }

    async canClose (): Promise<boolean> {
        const children = await this.session?.getChildProcesses()
        if (!children?.length) {
            return true
        }
        return (await this.platform.showMessageBox(
            {
                type: 'warning',
                message: `"${children[0].command}" is still running. Close?`,
                buttons: ['Cancel', 'Kill'],
                defaultId: 1,
            }
        )).response === 1
    }

    ngOnDestroy (): void {
        super.ngOnDestroy()
        this.session?.destroy()
    }
}
