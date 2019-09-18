import { Component, Input } from '@angular/core'
import { Subscription } from 'rxjs'
import { first } from 'rxjs/operators'
import { BaseTabProcess } from 'terminus-core'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'
import { SessionOptions } from '../api/interfaces'
import { Session } from '../services/sessions.service'
import { WIN_BUILD_CONPTY_SUPPORTED, isWindowsBuild } from '../utils'

/** @hidden */
@Component({
    selector: 'terminalTab',
    template: BaseTerminalTabComponent.template,
    styles: BaseTerminalTabComponent.styles,
    animations: BaseTerminalTabComponent.animations,
})
export class TerminalTabComponent extends BaseTerminalTabComponent {
    @Input() sessionOptions: SessionOptions
    private homeEndSubscription: Subscription

    ngOnInit () {
        this.logger = this.log.create('terminalTab')
        this.session = new Session(this.config)

        const isConPTY = isWindowsBuild(WIN_BUILD_CONPTY_SUPPORTED) && this.config.store.terminal.useConPTY

        this.homeEndSubscription = this.hotkeys.matchedHotkey.subscribe(hotkey => {
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

        this.frontendReady$.pipe(first()).subscribe(() => {
            this.initializeSession(this.size.columns, this.size.rows)
        })

        super.ngOnInit()
    }

    initializeSession (columns: number, rows: number) {
        this.sessions.addSession(
            this.session,
            Object.assign({}, this.sessionOptions, {
                width: columns,
                height: rows,
            })
        )

        this.attachSessionHandlers()
    }

    async getRecoveryToken (): Promise<any> {
        const cwd = this.session ? await this.session.getWorkingDirectory() : null
        return {
            type: 'app:terminal-tab',
            sessionOptions: {
                ...this.sessionOptions,
                cwd: cwd || this.sessionOptions.cwd,
            },
        }
    }

    async getCurrentProcess (): Promise<BaseTabProcess|null> {
        const children = await this.session.getChildProcesses()
        if (!children.length) {
            return null
        }
        return {
            name: children[0].command,
        }
    }

    async canClose (): Promise<boolean> {
        const children = await this.session.getChildProcesses()
        if (children.length === 0) {
            return true
        }
        return (await this.electron.showMessageBox(
            this.hostApp.getWindow(),
            {
                type: 'warning',
                message: `"${children[0].command}" is still running. Close?`,
                buttons: ['Cancel', 'Kill'],
                defaultId: 1,
            }
        )).response === 1
    }

    ngOnDestroy () {
        this.homeEndSubscription.unsubscribe()
        super.ngOnDestroy()
        this.session.destroy()
    }
}
