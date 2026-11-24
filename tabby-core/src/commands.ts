/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'

import { HostAppService, Platform } from './api/hostApp'
import { HostWindowService } from './api/hostWindow'
import { ProfilesService } from './services/profiles.service'
import { AppService } from './services/app.service'
import { CommandProvider, Command, CommandLocation, CommandContext } from './api/commands'
import { SplitDirection, SplitTabComponent } from './components/splitTab.component'
import { BaseTabComponent } from './components/baseTab.component'
import { PromptModalComponent } from './components/promptModal.component'
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
        private hostWindow: HostWindowService,
    ) {
        super()
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
                hotkey: 'profile-selector',
            },
            {
                id: 'core:reopen-tab',
                label: this.translate.instant('Reopen last tab'),
                locations: [],
                hotkey: 'reopen-tab',
                run: async () => this.app.reopenLastTab(),
            },
            {
                id: 'core:toggle-fullscreen',
                label: this.translate.instant('Toggle fullscreen mode'),
                locations: [],
                hotkey: 'toggle-fullscreen',
                run: async () => this.hostWindow.toggleFullscreen(),
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
                hotkey: tab.parent ? undefined : 'close-tab',
                run: tab.effectivelyPinned ? undefined : async () => {
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
                run: tab.effectivelyPinned ? undefined : async () => {
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
                hotkey: tab.parent ? undefined : 'rename-tab',
                run: async () => this.app.renameTab(tab),
            })
            commands.push({
                id: 'core:duplicate-tab',
                label: this.translate.instant('Duplicate tab'),
                locations: [CommandLocation.TabHeaderMenu],
                group: 'core:common',
                weight: -12,
                hotkey: tab.parent ? undefined : 'duplicate-tab',
                run: async () => this.app.duplicateTab(tab),
            })
            commands.push({
                id: 'core:pin-tab',
                label: this.translate.instant('Pin tab'),
                locations: [CommandLocation.TabHeaderMenu],
                group: 'core:common',
                weight: -11.5,
                checked: tab.pinned,
                hotkey: tab.parent ? undefined : 'pin-tab',
                run: async () => this.app.toggleTabPinned(tab),
            })

            if (!tab.parent) {
                // Act on the app's tab list, so only offered for the active top-level tab
                const tabActions: [string, string, () => any][] = [
                    ['restart-tab', this.translate.instant('Restart tab'), () => this.app.restartTab(tab)],
                    ['toggle-last-tab', this.translate.instant('Toggle last tab'), () => this.app.toggleLastTab()],
                    ['next-tab', this.translate.instant('Next tab'), () => this.app.nextTab()],
                    ['previous-tab', this.translate.instant('Previous tab'), () => this.app.previousTab()],
                    ['next-mru-tab', this.translate.instant('Next tab (MRU order)'), () => this.app.nextMRUTab()],
                    ['previous-mru-tab', this.translate.instant('Previous tab (MRU order)'), () => this.app.previousMRUTab()],
                    ['move-tab-left', this.translate.instant('Move tab to the left'), () => this.app.moveSelectedTabLeft()],
                    ['move-tab-right', this.translate.instant('Move tab to the right'), () => this.app.moveSelectedTabRight()],
                ]
                if (tab instanceof SplitTabComponent) {
                    tabActions.push(
                        ['explode-tab', this.translate.instant('Turn current tab\'s panes into separate tabs'), () => this.app.explodeTab(tab)],
                        ['combine-tabs', this.translate.instant('Combine all tabs into the current tab'), () => this.app.combineTabsInto(tab)],
                    )
                }
                for (const [hotkey, label, run] of tabActions) {
                    commands.push({ id: `core:${hotkey}`, label, locations: [], hotkey, run: async () => run() })
                }
            }
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

            if (tab.parent instanceof SplitTabComponent && tab.parent.getAllTabs().length > 1) {
                commands.push({
                    id: 'core:rename-pane',
                    label: this.translate.instant('Rename pane'),
                    group: 'core:pane-title',
                    locations: [CommandLocation.TabBodyMenu],
                    weight: -2,
                    run: async () => this.app.renameTab(tab),
                })
                commands.push({
                    id: 'core:show-pane-label',
                    label: this.translate.instant('Show pane label'),
                    group: 'core:pane-title',
                    locations: [CommandLocation.TabBodyMenu],
                    weight: -2,
                    checked: !!tab.customTitle && tab.customTitleVisible,
                    run: tab.customTitle ? async () => {
                        tab.setCustomTitleVisible(!tab.customTitleVisible)
                        this.app.emitTabsChanged()
                    } : undefined,
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
                        hotkey: { r: 'split-right', b: 'split-bottom', l: 'split-left', t: 'split-top' }[dir],
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
                    hotkey: 'switch-profile',
                    run: async () => this.switchTabProfile(tab),
                })

                const split = tab.parent
                commands.push({
                    id: 'core:close-pane',
                    label: this.translate.instant('Close focused pane'),
                    locations: [],
                    hotkey: 'close-pane',
                    run: tab.effectivelyPinned ? undefined : async () => tab.destroy(),
                })
                if (split.getAllTabs().length > 1) {
                    const paneActions: [string, string, () => void][] = [
                        ['pane-maximize', this.translate.instant('Maximize the active pane'), () => split.maximize(split.getMaximizedTab() ? null : tab)],
                        ['pane-nav-up', this.translate.instant('Focus the pane above'), () => split.navigate('t')],
                        ['pane-nav-down', this.translate.instant('Focus the pane below'), () => split.navigate('b')],
                        ['pane-nav-left', this.translate.instant('Focus the pane on the left'), () => split.navigate('l')],
                        ['pane-nav-right', this.translate.instant('Focus the pane on the right'), () => split.navigate('r')],
                        ['pane-nav-previous', this.translate.instant('Focus previous pane'), () => split.navigateLinear(-1)],
                        ['pane-nav-next', this.translate.instant('Focus next pane'), () => split.navigateLinear(1)],
                        ['pane-increase-vertical', this.translate.instant('Increase vertical split size'), () => split.resizePane('v')],
                        ['pane-decrease-vertical', this.translate.instant('Decrease vertical split size'), () => split.resizePane('dv')],
                        ['pane-increase-horizontal', this.translate.instant('Increase horizontal split size'), () => split.resizePane('h')],
                        ['pane-decrease-horizontal', this.translate.instant('Decrease horizontal split size'), () => split.resizePane('dh')],
                    ]
                    for (const [hotkey, label, run] of paneActions) {
                        commands.push({ id: `core:${hotkey}`, label, locations: [], hotkey, run: async () => run() })
                    }
                }
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
                checked: !!extTab.__completionNotificationEnabled,
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
