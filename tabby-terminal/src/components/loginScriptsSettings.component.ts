/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'

import { PlatformService } from 'tabby-core'
import { LoginScript, LoginScriptsOptions } from '../api/loginScriptProcessing'

/** @hidden */
@Component({
    selector: 'login-scripts-settings',
    template: require('./loginScriptsSettings.component.pug'),
})
export class LoginScriptsSettingsComponent {
    @Input() options: LoginScriptsOptions
    scripts: LoginScript[]

    constructor (
        private platform: PlatformService,
    ) { }

    ngOnInit () {
        this.scripts = this.options.scripts ?? []
    }

    async deleteScript (script: LoginScript) {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: 'Delete this script?',
                detail: script.expect,
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
            this.scripts = this.scripts.filter(x => x !== script)
        }
    }

    addScript () {
        this.scripts.push({ expect: '', send: '' })
    }

    save () {
        this.options.scripts = this.scripts
    }
}
