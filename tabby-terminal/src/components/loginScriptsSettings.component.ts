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

    constructor (
        private platform: PlatformService,
    ) { }

    ngOnInit () {
        this.options.scripts ??= []
    }

    moveScriptUp (script: LoginScript) {
        const index = this.options.scripts!.indexOf(script)
        if (index > 0) {
            this.options.scripts!.splice(index, 1)
            this.options.scripts!.splice(index - 1, 0, script)
        }
    }

    moveScriptDown (script: LoginScript) {
        const index = this.options.scripts!.indexOf(script)
        if (index >= 0 && index < this.options.scripts!.length - 1) {
            this.options.scripts!.splice(index, 1)
            this.options.scripts!.splice(index + 1, 0, script)
        }
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
            this.options.scripts = this.options.scripts!.filter(x => x !== script)
        }
    }

    addScript () {
        this.options.scripts!.push({ expect: '', send: '' })
    }
}
