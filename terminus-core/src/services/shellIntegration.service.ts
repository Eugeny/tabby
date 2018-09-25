import * as path from 'path'
import * as fs from 'mz/fs'
import { exec } from 'mz/child_process'
import { Injectable } from '@angular/core'
import { ElectronService } from './electron.service'
import { HostAppService, Platform } from './hostApp.service'

let Registry = null
try {
    Registry = require('winreg')
} catch (_) { } // tslint:disable-line no-empty

@Injectable()
export class ShellIntegrationService {
    private automatorWorkflows = ['Open Terminus here.workflow', 'Paste path into Terminus.workflow']
    private automatorWorkflowsLocation: string
    private automatorWorkflowsDestination: string
    private registryKeys = [
        {
            path: '\\Software\\Classes\\Directory\\Background\\shell\\Open Terminus here',
            command: 'open "%V"'
        },
        {
            path: '\\Software\\Classes\\*\\shell\\Paste path into Terminus',
            command: 'paste "%V"'
        },
    ]
    constructor (
        private electron: ElectronService,
        private hostApp: HostAppService,
    ) {
        if (this.hostApp.platform === Platform.macOS) {
            this.automatorWorkflowsLocation = path.join(
                path.dirname(path.dirname(this.electron.app.getPath('exe'))),
                'Resources',
                'extras',
                'automator-workflows',
            )
            this.automatorWorkflowsDestination = path.join(process.env.HOME, 'Library', 'Services')
        }
    }

    async isInstalled (): Promise<boolean> {
        if (this.hostApp.platform === Platform.macOS) {
            return await fs.exists(path.join(this.automatorWorkflowsDestination, this.automatorWorkflows[0]))
        } else if (this.hostApp.platform === Platform.Windows) {
            return await new Promise<boolean>(resolve => {
                let reg = new Registry({ hive: Registry.HKCU, key: this.registryKeys[0].path, arch: 'x64' })
                reg.keyExists((err, exists) => resolve(!err && exists))
            })
        }
        return true
    }

    async install () {
        if (this.hostApp.platform === Platform.macOS) {
            for (let wf of this.automatorWorkflows) {
                await exec(`cp -r "${this.automatorWorkflowsLocation}/${wf}" "${this.automatorWorkflowsDestination}"`)
            }
        } else if (this.hostApp.platform === Platform.Windows) {
            for (let registryKey of this.registryKeys) {
                let reg = new Registry({ hive: Registry.HKCU, key: registryKey.path, arch: 'x64' })
                await new Promise(resolve => {
                    reg.set('Icon', Registry.REG_SZ, this.electron.app.getPath('exe'), () => {
                        reg.create(() => {
                            let cmd = new Registry({
                                hive: Registry.HKCU,
                                key: registryKey.path + '\\command',
                                arch: 'x64'
                            })
                            cmd.create(() => {
                                cmd.set(
                                    '',
                                    Registry.REG_SZ,
                                    this.electron.app.getPath('exe') + ' ' + registryKey.command,
                                    () => resolve()
                                )
                            })
                        })
                    })
                })
            }
        }
    }
}
