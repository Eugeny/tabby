/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'

import { PlatformService, TranslateService } from 'tabby-core'
import { LoginScript, LoginScriptsOptions } from '../middleware/loginScriptProcessing'

/** @hidden */
@Component({
    selector: 'login-scripts-settings',
    templateUrl: './loginScriptsSettings.component.pug',
})
export class LoginScriptsSettingsComponent {
    @Input() options: LoginScriptsOptions
    scripts: LoginScript[]

    constructor (
        private platform: PlatformService,
        private translate: TranslateService,
    ) { }

    ngOnInit () {
        this.scripts = this.options.scripts
    }

    async deleteScript (script: LoginScript) {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: this.translate.instant('Delete this script?'),
                detail: script.expect,
                buttons: [
                    this.translate.instant('Delete'),
                    this.translate.instant('Keep'),
                ],
                defaultId: 0,
                cancelId: 1,
            },
        )).response === 0) {
            this.scripts = this.scripts.filter(x => x !== script)
            this.options.scripts = this.scripts
        }
    }

    moveScript (index: number, delta: number) {
        const target = index + delta
        if (target < 0 || target >= this.scripts.length) {
            return
        }
        const [script] = this.scripts.splice(index, 1)
        this.scripts.splice(target, 0, script)
    }

    addScript () {
        this.scripts.push({ expect: '', send: '' })
    }

    save () {
        this.options.scripts = this.scripts
    }
}
