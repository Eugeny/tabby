/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslateService } from '@ngx-translate/core'
import { Subscription } from 'rxjs'
import { AppService } from './services/app.service'
import { BaseTabComponent } from './components/baseTab.component'
import { SplitTabComponent, SplitDirection } from './components/splitTab.component'
import { TabContextMenuItemProvider } from './api/tabContextMenuProvider'
import { MenuItemOptions } from './api/menu'
import { ProfilesService } from './services/profiles.service'
import { TabsService } from './services/tabs.service'
import { HotkeysService } from './services/hotkeys.service'
import { PromptModalComponent } from './components/promptModal.component'
import { SplitLayoutProfilesService } from './profiles'
import { TAB_COLORS } from './utils'

/** @hidden */
@Injectable()
export class TabManagementContextMenu extends TabContextMenuItemProvider {
    weight = 99

    constructor (
        private app: AppService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
        let items: MenuItemOptions[] = [
            {
                label: this.translate.instant('Close'),
                commandLabel: this.translate.instant('Close tab'),
                click: () => {
                    if (this.app.tabs.includes(tab)) {
                        this.app.closeTab(tab, true)
                    } else {
                        tab.destroy()
                    }
                },
            },
        ]
        if (!tab.parent) {
            items = [
                ...items,
                {
                    label: this.translate.instant('Close other tabs'),
                    click: () => {
                        for (const t of this.app.tabs.filter(x => x !== tab)) {
                            this.app.closeTab(t, true)
                        }
                    },
                },
                {
                    label: this.translate.instant('Close tabs to the right'),
                    click: () => {
                        for (const t of this.app.tabs.slice(this.app.tabs.indexOf(tab) + 1)) {
                            this.app.closeTab(t, true)
                        }
                    },
                },
                {
                    label: this.translate.instant('Close tabs to the left'),
                    click: () => {
                        for (const t of this.app.tabs.slice(0, this.app.tabs.indexOf(tab))) {
                            this.app.closeTab(t, true)
                        }
                    },
                },
            ]
        } else if (tab.parent instanceof SplitTabComponent) {
            const directions: SplitDirection[] = ['r', 'b', 'l', 't']
            items.push({
                label: this.translate.instant('Split'),
                submenu: directions.map(dir => ({
                    label: {
                        r: this.translate.instant('Right'),
                        b: this.translate.instant('Down'),
                        l: this.translate.instant('Left'),
                        t: this.translate.instant('Up'),
                    }[dir],
                    commandLabel: {
                        r: this.translate.instant('Split to the right'),
                        b: this.translate.instant('Split to the down'),
                        l: this.translate.instant('Split to the left'),
                        t: this.translate.instant('Split to the up'),
                    }[dir],
                    click: () => {
                        (tab.parent as SplitTabComponent).splitTab(tab, dir)
                    },
                })) as MenuItemOptions[],
            })
        }
        return items
    }
}

/** @hidden */
@Injectable()
export class CommonOptionsContextMenu extends TabContextMenuItemProvider {
    weight = -1

    constructor (
        private app: AppService,
        private ngbModal: NgbModal,
        private splitLayoutProfilesService: SplitLayoutProfilesService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent, tabHeader?: boolean): Promise<MenuItemOptions[]> {
        let items: MenuItemOptions[] = []
        if (tabHeader) {
            const currentColor = TAB_COLORS.find(x => x.value === tab.color)?.name
            items = [
                ...items,
                {
                    label: this.translate.instant('Rename'),
                    commandLabel: this.translate.instant('Rename tab'),
                    click: () => {
                        this.app.renameTab(tab)
                    },
                },
                {
                    label: this.translate.instant('Duplicate'),
                    commandLabel: this.translate.instant('Duplicate tab'),
                    click: () => this.app.duplicateTab(tab),
                },
                {
                    label: this.translate.instant('Color'),
                    commandLabel: this.translate.instant('Change tab color'),
                    sublabel: currentColor ? this.translate.instant(currentColor) : undefined,
                    submenu: TAB_COLORS.map(color => ({
                        label: this.translate.instant(color.name) ?? color.name,
                        type: 'radio',
                        checked: tab.color === color.value,
                        click: () => {
                            tab.color = color.value
                        },
                    })) as MenuItemOptions[],
                },
            ]

            if (tab instanceof SplitTabComponent && tab.getAllTabs().length > 1) {
                items.push({
                    label: this.translate.instant('Save layout as profile'),
                    click: async () => {
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
        return items
    }
}

/** @hidden */
@Injectable()
export class TaskCompletionContextMenu extends TabContextMenuItemProvider {
    constructor (
        private app: AppService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
        const process = await tab.getCurrentProcess()
        const items: MenuItemOptions[] = []

        const extTab: (BaseTabComponent & { __completionNotificationEnabled?: boolean, __outputNotificationSubscription?: Subscription|null }) = tab

        if (process) {
            items.push({
                enabled: false,
                label: this.translate.instant('Current process: {name}', process),
            })
            items.push({
                label: this.translate.instant('Notify when done'),
                type: 'checkbox',
                checked: extTab.__completionNotificationEnabled,
                click: () => {
                    extTab.__completionNotificationEnabled = !extTab.__completionNotificationEnabled

                    if (extTab.__completionNotificationEnabled) {
                        this.app.observeTabCompletion(tab).subscribe(() => {
                            new Notification(this.translate.instant('Process completed'), {
                                body: process.name,
                            }).addEventListener('click', () => {
                                this.app.selectTab(tab)
                            })
                            extTab.__completionNotificationEnabled = false
                        })
                    } else {
                        this.app.stopObservingTabCompletion(tab)
                    }
                },
            })
        }
        items.push({
            label: this.translate.instant('Notify on activity'),
            type: 'checkbox',
            checked: !!extTab.__outputNotificationSubscription,
            click: () => {
                tab.clearActivity()

                if (extTab.__outputNotificationSubscription) {
                    extTab.__outputNotificationSubscription.unsubscribe()
                    extTab.__outputNotificationSubscription = null
                } else {
                    extTab.__outputNotificationSubscription = tab.activity$.subscribe(active => {
                        if (extTab.__outputNotificationSubscription && active) {
                            extTab.__outputNotificationSubscription.unsubscribe()
                            extTab.__outputNotificationSubscription = null
                            new Notification(this.translate.instant('Tab activity'), {
                                body: tab.title,
                            }).addEventListener('click', () => {
                                this.app.selectTab(tab)
                            })
                        }
                    })
                }
            },
        })
        return items
    }
}


/** @hidden */
@Injectable()
export class ProfilesContextMenu extends TabContextMenuItemProvider {
    weight = 10

    constructor (
        private profilesService: ProfilesService,
        private tabsService: TabsService,
        private app: AppService,
        private translate: TranslateService,
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

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {

        if (tab.parent instanceof SplitTabComponent && tab.parent.getAllTabs().length > 1) {
            return [
                {
                    label: this.translate.instant('Switch profile'),
                    click: () => this.switchTabProfile(tab),
                },
            ]
        }

        return []
    }
}
