import deepClone from 'clone-deep'
import { Injectable, Inject } from '@angular/core'
import { ProfileProvider, Profile, NewTabParameters, ConfigService, SplitTabComponent, AppService } from 'tabby-core'
import { TerminalTabComponent } from './components/terminalTab.component'
import { LocalProfileSettingsComponent } from './components/localProfileSettings.component'
import { ShellProvider, Shell, SessionOptions } from './api'

@Injectable({ providedIn: 'root' })
export class LocalProfilesService extends ProfileProvider {
    id = 'local'
    name = 'Local'
    settingsComponent = LocalProfileSettingsComponent
    configDefaults = {
        options: {
            restoreFromPTYID: null,
            command: '',
            args: [],
            cwd: null,
            env: {
                __nonStructural: true,
            },
            width: null,
            height: null,
            pauseAfterExit: false,
            runAsAdministrator: false,
        },
    }

    constructor (
        private app: AppService,
        private config: ConfigService,
        @Inject(ShellProvider) private shellProviders: ShellProvider[],
    ) {
        super()
    }

    async getBuiltinProfiles (): Promise<Profile[]> {
        return (await this.getShells()).map(shell => ({
            id: `local:${shell.id}`,
            type: 'local',
            name: shell.name,
            icon: shell.icon,
            options: this.optionsFromShell(shell),
            isBuiltin: true,
        }))
    }

    async getNewTabParameters (profile: Profile): Promise<NewTabParameters<TerminalTabComponent>> {
        profile = deepClone(profile)

        if (!profile.options?.cwd) {
            if (this.app.activeTab instanceof TerminalTabComponent && this.app.activeTab.session) {
                profile.options ??= {}
                profile.options.cwd = await this.app.activeTab.session.getWorkingDirectory()
            }
            if (this.app.activeTab instanceof SplitTabComponent) {
                const focusedTab = this.app.activeTab.getFocusedTab()

                if (focusedTab instanceof TerminalTabComponent && focusedTab.session) {
                    profile.options ??= {}
                    profile.options.cwd = await focusedTab.session.getWorkingDirectory()
                }
            }
        }

        return {
            type: TerminalTabComponent,
            inputs: {
                profile,
            },
        }
    }

    async getShells (): Promise<Shell[]> {
        const shellLists = await Promise.all(this.config.enabledServices(this.shellProviders).map(x => x.provide()))
        return shellLists.reduce((a, b) => a.concat(b), [])
    }

    optionsFromShell (shell: Shell): SessionOptions {
        return {
            command: shell.command,
            args: shell.args ?? [],
            env: shell.env,
        }
    }

    getDescription (profile: Profile): string {
        return profile.options?.command
    }
}
