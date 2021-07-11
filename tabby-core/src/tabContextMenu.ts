/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Subscription } from 'rxjs'
import { AppService } from './services/app.service'
import { BaseTabComponent } from './components/baseTab.component'
import { TabHeaderComponent } from './components/tabHeader.component'
import { SplitTabComponent, SplitDirection } from './components/splitTab.component'
import { TabContextMenuItemProvider } from './api/tabContextMenuProvider'
import { MenuItemOptions } from './api/menu'
import { ProfilesService } from './services/profiles.service'
import { TabsService } from './services/tabs.service'
import { HotkeysService } from './services/hotkeys.service'
import { PromptModalComponent } from './components/promptModal.component'
import { SplitLayoutProfilesService } from './profiles'

/** @hidden */
@Injectable()
export class TabManagementContextMenu extends TabContextMenuItemProvider {
    weight = 99

    constructor (
        private app: AppService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent, tabHeader?: TabHeaderComponent): Promise<MenuItemOptions[]> {
        let items: MenuItemOptions[] = [
            {
                label: 'Close',
                click: () => {
                    if (this.app.tabs.includes(tab)) {
                        this.app.closeTab(tab, true)
                    } else {
                        tab.destroy()
                    }
                },
            },
        ]
        if (tabHeader) {
            items = [
                ...items,
                {
                    label: 'Close other tabs',
                    click: () => {
                        for (const t of this.app.tabs.filter(x => x !== tab)) {
                            this.app.closeTab(t, true)
                        }
                    },
                },
                {
                    label: 'Close tabs to the right',
                    click: () => {
                        for (const t of this.app.tabs.slice(this.app.tabs.indexOf(tab) + 1)) {
                            this.app.closeTab(t, true)
                        }
                    },
                },
                {
                    label: 'Close tabs to the left',
                    click: () => {
                        for (const t of this.app.tabs.slice(0, this.app.tabs.indexOf(tab))) {
                            this.app.closeTab(t, true)
                        }
                    },
                },
            ]
        } else {
            if (tab.parent instanceof SplitTabComponent) {
                const directions: SplitDirection[] = ['r', 'b', 'l', 't']
                items.push({
                    label: 'Split',
                    submenu: directions.map(dir => ({
                        label: {
                            r: 'Right',
                            b: 'Down',
                            l: 'Left',
                            t: 'Up',
                        }[dir],
                        click: () => {
                            (tab.parent as SplitTabComponent).splitTab(tab, dir)
                        },
                    })) as MenuItemOptions[],
                })
            }
        }
        return items
    }
}

const COLORS = [
    { name: 'No color', value: null },
    { name: 'Blue', value: '#0275d8' },
    { name: 'Green', value: '#5cb85c' },
    { name: 'Orange', value: '#f0ad4e' },
    { name: 'Purple', value: '#613d7c' },
    { name: 'Red', value: '#d9534f' },
    { name: 'Yellow', value: '#ffd500' },
]

/** @hidden */
@Injectable()
export class CommonOptionsContextMenu extends TabContextMenuItemProvider {
    weight = -1

    constructor (
        private app: AppService,
        private ngbModal: NgbModal,
        private splitLayoutProfilesService: SplitLayoutProfilesService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent, tabHeader?: TabHeaderComponent): Promise<MenuItemOptions[]> {
        let items: MenuItemOptions[] = []
        if (tabHeader) {
            items = [
                ...items,
                {
                    label: 'Rename',
                    click: () => tabHeader.showRenameTabModal(),
                },
                {
                    label: 'Duplicate',
                    click: () => this.app.duplicateTab(tab),
                },
                {
                    label: 'Color',
                    sublabel: COLORS.find(x => x.value === tab.color)?.name,
                    submenu: COLORS.map(color => ({
                        label: color.name,
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
                    label: 'Save layout as profile',
                    click: async () => {
                        const modal = this.ngbModal.open(PromptModalComponent)
                        modal.componentInstance.prompt = 'Profile name'
                        const name = (await modal.result)?.value
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
                label: 'Current process: ' + process.name,
            })
            items.push({
                label: 'Notify when done',
                type: 'checkbox',
                checked: extTab.__completionNotificationEnabled,
                click: () => {
                    extTab.__completionNotificationEnabled = !extTab.__completionNotificationEnabled

                    if (extTab.__completionNotificationEnabled) {
                        this.app.observeTabCompletion(tab).subscribe(() => {
                            new Notification('Process completed', {
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
            label: 'Notify on activity',
            type: 'checkbox',
            checked: !!extTab.__outputNotificationSubscription,
            click: () => {
                if (extTab.__outputNotificationSubscription) {
                    extTab.__outputNotificationSubscription.unsubscribe()
                    extTab.__outputNotificationSubscription = null
                } else {
                    extTab.__outputNotificationSubscription = tab.activity$.subscribe(active => {
                        if (extTab.__outputNotificationSubscription && active) {
                            extTab.__outputNotificationSubscription.unsubscribe()
                            extTab.__outputNotificationSubscription = null
                            new Notification('Tab activity', {
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
        const profile = await this.profilesService.showProfileSelector()
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

    async getItems (tab: BaseTabComponent, tabHeader?: TabHeaderComponent): Promise<MenuItemOptions[]> {

        if (!tabHeader && tab.parent instanceof SplitTabComponent && tab.parent.getAllTabs().length > 1) {
            return [
                {
                    label: 'Switch profile',
                    click: () => this.switchTabProfile(tab),
                },
            ]
        }

        return []
    }
}
