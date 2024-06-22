/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'

import { HostAppService, Platform } from './api/hostApp'
import { ProfilesService } from './services/profiles.service'
import { AppService } from './services/app.service'
import { CommandProvider, Command, CommandLocation, CommandContext } from './api/commands'
import { SplitDirection, SplitTabComponent } from './components/splitTab.component'
import { BaseTabComponent } from './components/baseTab.component'
import { PromptModalComponent } from './components/promptModal.component'
import { HotkeysService } from './services/hotkeys.service'
import { TabsService } from './services/tabs.service'
import { SplitLayoutProfilesService } from './profiles'
import { TAB_COLORS } from './utils'
import { Subscription } from 'rxjs'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class CoreCommandProvider extends CommandProvider {
    constructor (
        private hostApp: HostAppService,
        private profilesService: ProfilesService,
        private translate: TranslateService,
        private app: AppService,
        private splitLayoutProfilesService: SplitLayoutProfilesService,
        private ngbModal: NgbModal,
        private tabsService: TabsService,
        hotkeys: HotkeysService,
    ) {
        super()
        hotkeys.hotkey$.subscribe(hotkey => {
            if (hotkey === 'switch-profile') {
                let tab = this.app.activeTab
                if (tab instanceof SplitTabComponent) {
                    tab = tab.getFocusedTab()
                    if (tab) {
                        this.switchTabProfile(tab)
                    }
                }
            }
        })
    }

    async switchTabProfile (tab: BaseTabComponent) {
        const profile = await this.profilesService.showProfileSelector().catch(() => null)
        if (!profile) {
            return
        }

        const params = await this.profilesService.newTabParametersForProfile(profile)
        if (!params) {
            return
        }

        if (!await tab.canClose()) {
            return
        }

        const newTab = this.tabsService.create(params)
        ;(tab.parent as SplitTabComponent).replaceTab(tab, newTab)

        tab.destroy()
    }

    async showProfileSelector () {
        const profile = await this.profilesService.showProfileSelector().catch(() => null)
        if (profile) {
            this.profilesService.launchProfile(profile)
        }
    }

    async provide (context: CommandContext): Promise<Command[]> {
        const commands: Command[] = [
            {
                id: 'core:profile-selector',
                locations: [CommandLocation.LeftToolbar, CommandLocation.StartPage],
                label: this.translate.instant('Profiles & connections'),
                weight: 12,
                icon: this.hostApp.platform === Platform.Web
                    ? require('./icons/plus.svg')
                    : require('./icons/profiles.svg'),
                run: async () => this.showProfileSelector(),
            },
            ...this.profilesService.getRecentProfiles().map((profile, index) => ({
                id: `core:recent-profile-${index}`,
                label: profile.name,
                locations: [CommandLocation.StartPage],
                icon: require('./icons/history.svg'),
                weight: 20,
                run: async () => {
                    const p = (await this.profilesService.getProfiles()).find(x => x.id === profile.id) ?? profile
                    this.profilesService.launchProfile(p)
                },
            })),
        ]

        if (context.tab) {
            const tab = context.tab

            commands.push({
                id: `core:close-tab`,
                label: this.translate.instant('Close tab'),
                locations: [CommandLocation.TabHeaderMenu],
                weight: -35,
                group: 'core:close',
                run: async () => {
                    if (this.app.tabs.includes(tab)) {
                        this.app.closeTab(tab, true)
                    } else {
                        tab.destroy()
                    }
                },
            })

            commands.push({
                id: `core:close`,
                label: this.translate.instant('Close'),
                locations: [CommandLocation.TabBodyMenu],
                weight: 99,
                group: 'core:close',
                run: async () => {
                    tab.destroy()
                },
            })

            if (!context.tab.parent) {
                commands.push(...[{
                    id: 'core:close-other-tabs',
                    label: this.translate.instant('Close other tabs'),
                    locations: [CommandLocation.TabHeaderMenu],
                    weight: -34,
                    group: 'core:close',
                    run: async () => {
                        for (const t of this.app.tabs.filter(x => x !== tab)) {
                            this.app.closeTab(t, true)
                        }
                    },
                },
                {
                    id: 'core:close-tabs-to-the-right',
                    label: this.translate.instant('Close tabs to the right'),
                    locations: [CommandLocation.TabHeaderMenu],
                    weight: -33,
                    group: 'core:close',
                    run: async () => {
                        for (const t of this.app.tabs.slice(this.app.tabs.indexOf(tab) + 1)) {
                            this.app.closeTab(t, true)
                        }
                    },
                },
                {
                    id: 'core:close-tabs-to-the-left',
                    label: this.translate.instant('Close tabs to the left'),
                    locations: [CommandLocation.TabHeaderMenu],
                    weight: -32,
                    group: 'core:close',
                    run: async () => {
                        for (const t of this.app.tabs.slice(0, this.app.tabs.indexOf(tab))) {
                            this.app.closeTab(t, true)
                        }
                    },
                }])
            }

            commands.push({
                id: 'core:rename-tab',
                label: this.translate.instant('Rename tab'),
                locations: [CommandLocation.TabHeaderMenu],
                group: 'core:common',
                weight: -13,
                run: async () => this.app.renameTab(tab),
            })
            commands.push({
                id: 'core:duplicate-tab',
                label: this.translate.instant('Duplicate tab'),
                locations: [CommandLocation.TabHeaderMenu],
                group: 'core:common',
                weight: -12,
                run: async () => this.app.duplicateTab(tab),
            })
            commands.push({
                id: 'core:tab-color',
                label: this.translate.instant('Color'),
                group: 'core:common',
                locations: [CommandLocation.TabHeaderMenu],
                weight: -11,
            })
            for (const color of TAB_COLORS) {
                commands.push({
                    id: `core:tab-color-${color.name.toLowerCase()}`,
                    parent: 'core:tab-color',
                    label: this.translate.instant(color.name) ?? color.name,
                    fullLabel: this.translate.instant('Set tab color to {color}', { color: this.translate.instant(color.name) }),
                    checked: tab.color === color.value,
                    locations: [CommandLocation.TabHeaderMenu],
                    run: async () => {
                        tab.color = color.value
                    },
                })
            }

            if (tab.parent instanceof SplitTabComponent) {
                const directions: SplitDirection[] = ['r', 'b', 'l', 't']
                commands.push({
                    id: 'core:split',
                    label: this.translate.instant('Split'),
                    group: 'core:panes',
                    locations: [CommandLocation.TabBodyMenu],
                })
                for (const dir of directions) {
                    commands.push({
                        id: `core:split-${dir}`,
                        label: {
                            r: this.translate.instant('Right'),
                            b: this.translate.instant('Down'),
                            l: this.translate.instant('Left'),
                            t: this.translate.instant('Up'),
                        }[dir],
                        fullLabel: {
                            r: this.translate.instant('Split to the right'),
                            b: this.translate.instant('Split to the down'),
                            l: this.translate.instant('Split to the left'),
                            t: this.translate.instant('Split to the up'),
                        }[dir],
                        locations: [CommandLocation.TabBodyMenu],
                        parent: 'core:split',
                        run: async () => {
                            (tab.parent as SplitTabComponent).splitTab(tab, dir)
                        },
                    })
                }

                commands.push({
                    id: 'core:switch-profile',
                    label: this.translate.instant('Switch profile'),
                    group: 'core:common',
                    locations: [CommandLocation.TabBodyMenu],
                    run: async () => this.switchTabProfile(tab),
                })
            }

            if (tab instanceof SplitTabComponent && tab.getAllTabs().length > 1) {
                commands.push({
                    id: 'core:save-split-tab-as-profile',
                    label: this.translate.instant('Save layout as profile'),
                    group: 'core:common',
                    locations: [CommandLocation.TabHeaderMenu],
                    run: async () => {
                        const modal = this.ngbModal.open(PromptModalComponent)
                        modal.componentInstance.prompt = this.translate.instant('Profile name')
                        const name = (await modal.result.catch(() => null))?.value
                        if (!name) {
                            return
                        }
                        this.splitLayoutProfilesService.createProfile(tab, name)
                    },
                })
            }
        }

        return commands
    }
}

/** @hidden */
@Injectable({ providedIn: 'root' })
export class TaskCompletionCommandProvider extends CommandProvider {
    constructor (
        private app: AppService,
        private translate: TranslateService,
    ) {
        super()
    }

    async provide (context: CommandContext): Promise<Command[]> {
        if (!context.tab) {
            return []
        }

        const process = await context.tab.getCurrentProcess()
        const items: Command[] = []

        const extTab: (BaseTabComponent & { __completionNotificationEnabled?: boolean, __outputNotificationSubscription?: Subscription|null }) = context.tab

        if (process) {
            items.push({
                id: 'core:process-name',
                label: this.translate.instant('Current process: {name}', process),
                group: 'core:process',
                weight: -1,
                locations: [CommandLocation.TabBodyMenu, CommandLocation.TabHeaderMenu],
            })
            items.push({
                id: 'core:notify-when-done',
                label: this.translate.instant('Notify when done'),
                group: 'core:process',
                weight: 0,
                checked: extTab.__completionNotificationEnabled,
                locations: [CommandLocation.TabBodyMenu, CommandLocation.TabHeaderMenu],
                run: async () => {
                    extTab.__completionNotificationEnabled = !extTab.__completionNotificationEnabled

                    if (extTab.__completionNotificationEnabled) {
                        this.app.observeTabCompletion(extTab).subscribe(() => {
                            new Notification(this.translate.instant('Process completed'), {
                                body: process.name,
                            }).addEventListener('click', () => {
                                this.app.selectTab(extTab)
                            })
                            extTab.__completionNotificationEnabled = false
                        })
                    } else {
                        this.app.stopObservingTabCompletion(extTab)
                    }
                },
            })
        }
        items.push({
            id: 'core:notify-on-activity',
            label: this.translate.instant('Notify on activity'),
            group: 'core:process',
            checked: !!extTab.__outputNotificationSubscription,
            locations: [CommandLocation.TabBodyMenu, CommandLocation.TabHeaderMenu],
            run: async () => {
                extTab.clearActivity()

                if (extTab.__outputNotificationSubscription) {
                    extTab.__outputNotificationSubscription.unsubscribe()
                    extTab.__outputNotificationSubscription = null
                } else {
                    extTab.__outputNotificationSubscription = extTab.activity$.subscribe(active => {
                        if (extTab.__outputNotificationSubscription && active) {
                            extTab.__outputNotificationSubscription.unsubscribe()
                            extTab.__outputNotificationSubscription = null
                            new Notification(this.translate.instant('Tab activity'), {
                                body: extTab.title,
                            }).addEventListener('click', () => {
                                this.app.selectTab(extTab)
                            })
                        }
                    })
                }
            },
        })
        return items
    }
}
