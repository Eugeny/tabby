import { Component, Input } from '@angular/core'
import { first } from 'rxjs/operators'
import { BaseTabProcess } from 'terminus-core'
import { BaseTerminalTabComponent } from './baseTerminalTab.component'
import { SessionOptions } from '../api'
import { Session } from '../services/sessions.service'

@Component({
    selector: 'terminalTab',
    template: BaseTerminalTabComponent.template,
    styles: BaseTerminalTabComponent.styles,
})
export class TerminalTabComponent extends BaseTerminalTabComponent {
    @Input() sessionOptions: SessionOptions

    ngOnInit () {
        this.logger = this.log.create('terminalTab')
        this.session = new Session(this.config)

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
        let cwd = this.session ? await this.session.getWorkingDirectory() : null
        return {
            type: 'app:terminal-tab',
            sessionOptions: {
                ...this.sessionOptions,
                cwd: cwd || this.sessionOptions.cwd,
            },
        }
    }

    async getCurrentProcess (): Promise<BaseTabProcess> {
        let children = await this.session.getChildProcesses()
        if (!children.length) {
            return null
        }
        return {
            name: children[0].command
        }
    }

    async canClose (): Promise<boolean> {
        let children = await this.session.getChildProcesses()
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

    async saveAsProfile () {
        let profile = {
            sessionOptions: {
                ...this.sessionOptions,
                cwd: (await this.session.getWorkingDirectory()) || this.sessionOptions.cwd,
            },
            name: this.sessionOptions.command,
        }
        this.config.store.terminal.profiles = [
            ...this.config.store.terminal.profiles,
            profile,
        ]
        this.config.save()
        this.toastr.info('Saved')
    }
}
