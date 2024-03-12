/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Inject, Injectable, Optional } from '@angular/core'

import { CommandProvider, Command, CommandLocation, TranslateService, CommandContext, ProfilesService } from 'tabby-core'

import { TerminalTabComponent } from './components/terminalTab.component'
import { TerminalService } from './services/terminal.service'
import { LocalProfile, UACService } from './api'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class LocalCommandProvider extends CommandProvider {
    constructor (
        private terminal: TerminalService,
        private profilesService: ProfilesService,
        private translate: TranslateService,
        @Optional() @Inject(UACService) private uac: UACService|undefined,
    ) {
        super()
    }

    async provide (context: CommandContext): Promise<Command[]> {
        const profiles = (await this.profilesService.getProfiles()).filter(x => x.type === 'local') as LocalProfile[]

        const commands: Command[] = [
            {
                id: 'local:new-tab',
                group: 'local:new-tab',
                label: this.translate.instant('New terminal'),
                locations: [CommandLocation.LeftToolbar, CommandLocation.StartPage, CommandLocation.TabBodyMenu, CommandLocation.TabHeaderMenu],
                weight: 11,
                icon: require('./icons/plus.svg'),
                run: async () => this.runOpenTab(context),
            },
        ]

        commands.push({
            id: 'local:new-tab-with-profile',
            group: 'local:new-tab',
            label: this.translate.instant('New with profile'),
            locations: [CommandLocation.TabBodyMenu, CommandLocation.TabHeaderMenu],
            weight: 12,
        })

        for (const profile of profiles) {
            commands.push({
                id: `local:new-tab-with-profile:${profile.id}`,
                group: 'local:new-tab',
                parent: 'local:new-tab-with-profile',
                label: profile.name,
                fullLabel: this.translate.instant('New terminal with profile: {profile}', { profile: profile.name }),
                locations: [CommandLocation.TabBodyMenu, CommandLocation.TabHeaderMenu],
                // eslint-disable-next-line @typescript-eslint/no-loop-func
                run: async () => {
                    let workingDirectory = profile.options.cwd
                    if (!workingDirectory && context.tab instanceof TerminalTabComponent) {
                        workingDirectory = await context.tab.session?.getWorkingDirectory() ?? undefined
                    }
                    await this.terminal.openTab(profile, workingDirectory)
                },
            })
        }

        if (this.uac?.isAvailable) {
            commands.push({
                id: 'local:new-tab-as-administrator-with-profile',
                group: 'local:new-tab',
                label: this.translate.instant('New admin tab'),
                locations: [CommandLocation.TabBodyMenu, CommandLocation.TabHeaderMenu],
                weight: 13,
            })

            for (const profile of profiles) {
                commands.push({
                    id: `local:new-tab-as-administrator-with-profile:${profile.id}`,
                    group: 'local:new-tab',
                    label: profile.name,
                    fullLabel: this.translate.instant('New admin tab with profile: {profile}', { profile: profile.name }),
                    locations: [CommandLocation.TabBodyMenu, CommandLocation.TabHeaderMenu],
                    run: async () => {
                        this.profilesService.openNewTabForProfile({
                            ...profile,
                            options: {
                                ...profile.options,
                                runAsAdministrator: true,
                            },
                        })
                    },
                })
            }

            if (context.tab && context.tab instanceof TerminalTabComponent) {
                const terminalTab = context.tab
                commands.push({
                    id: 'local:duplicate-tab-as-administrator',
                    group: 'local:new-tab',
                    label: this.translate.instant('Duplicate as administrator'),
                    locations: [CommandLocation.TabHeaderMenu],
                    weight: 14,
                    run: async () => {
                        this.profilesService.openNewTabForProfile({
                            ...terminalTab.profile,
                            options: {
                                ...terminalTab.profile.options,
                                runAsAdministrator: true,
                            },
                        })
                    },
                })
            }
        }

        return commands
    }

    runOpenTab (context: CommandContext) {
        if (context.tab && context.tab instanceof TerminalTabComponent) {
            this.profilesService.openNewTabForProfile(context.tab.profile)
        } else {
            this.terminal.openTab()
        }
    }
}
