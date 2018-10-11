import * as path from 'path'
import * as fs from 'mz/fs'
import { Registry } from 'rage-edit-tmp'
import { exec } from 'mz/child_process'
import { Injectable } from '@angular/core'
import { ElectronService } from './electron.service'
import { HostAppService, Platform } from './hostApp.service'

@Injectable()
export class ShellIntegrationService {
    private automatorWorkflows = ['Open Terminus here.workflow', 'Paste path into Terminus.workflow']
    private automatorWorkflowsLocation: string
    private automatorWorkflowsDestination: string
    private registryKeys = [
        {
            path: 'HKCU\\Software\\Classes\\Directory\\Background\\shell\\Open Terminus here',
            command: 'open "%V"'
        },
        {
            path: 'HKCU\\Software\\Classes\\*\\shell\\Paste path into Terminus',
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
        this.updatePaths()
    }

    async updatePaths (): Promise<void> {
        // Update paths in case of an update
        if (this.hostApp.platform === Platform.Windows) {
            if (await this.isInstalled()) {
                await this.install()
            }
        }
    }

    async isInstalled (): Promise<boolean> {
        if (this.hostApp.platform === Platform.macOS) {
            return await fs.exists(path.join(this.automatorWorkflowsDestination, this.automatorWorkflows[0]))
        } else if (this.hostApp.platform === Platform.Windows) {
            return await Registry.has(this.registryKeys[0].path)
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
                await Registry.set(registryKey.path, 'Icon', this.electron.app.getPath('exe'))
                await Registry.set(registryKey.path + '\\command', '', this.electron.app.getPath('exe') + ' ' + registryKey.command)
            }
        }
    }
}
