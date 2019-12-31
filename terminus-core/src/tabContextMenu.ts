import { Injectable, NgZone } from '@angular/core'
import { Subscription } from 'rxjs'
import { AppService } from './services/app.service'
import { BaseTabComponent } from './components/baseTab.component'
import { TabHeaderComponent } from './components/tabHeader.component'
import { TabContextMenuItemProvider } from './api/tabContextMenuProvider'

/** @hidden */
@Injectable()
export class CloseContextMenu extends TabContextMenuItemProvider {
    weight = -5

    constructor (
        private app: AppService,
        private zone: NgZone,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<Electron.MenuItemConstructorOptions[]> {
        return [
            {
                label: 'Close',
                click: () => this.zone.run(() => {
                    this.app.closeTab(tab, true)
                }),
            },
            {
                label: 'Close other tabs',
                click: () => this.zone.run(() => {
                    for (const t of this.app.tabs.filter(x => x !== tab)) {
                        this.app.closeTab(t, true)
                    }
                }),
            },
            {
                label: 'Close tabs to the right',
                click: () => this.zone.run(() => {
                    for (const t of this.app.tabs.slice(this.app.tabs.indexOf(tab) + 1)) {
                        this.app.closeTab(t, true)
                    }
                }),
            },
            {
                label: 'Close tabs to the left',
                click: () => this.zone.run(() => {
                    for (const t of this.app.tabs.slice(0, this.app.tabs.indexOf(tab))) {
                        this.app.closeTab(t, true)
                    }
                }),
            },
        ]
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
        private zone: NgZone,
        private app: AppService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent, tabHeader?: TabHeaderComponent): Promise<Electron.MenuItemConstructorOptions[]> {
        return [
            {
                label: 'Rename',
                click: () => this.zone.run(() => tabHeader?.showRenameTabModal()),
            },
            {
                label: 'Duplicate',
                click: () => this.zone.run(() => this.app.duplicateTab(tab)),
            },
            {
                label: 'Color',
                sublabel: COLORS.find(x => x.value === tab.color)!.name,
                submenu: COLORS.map(color => ({
                    label: color.name,
                    type: 'radio',
                    checked: tab.color === color.value,
                    click: () => this.zone.run(() => {
                        tab.color = color.value
                    }),
                })) as Electron.MenuItemConstructorOptions[],
            },
        ]
    }
}

/** @hidden */
@Injectable()
export class TaskCompletionContextMenu extends TabContextMenuItemProvider {
    constructor (
        private app: AppService,
        private zone: NgZone,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<Electron.MenuItemConstructorOptions[]> {
        const process = await tab.getCurrentProcess()
        let items: Electron.MenuItemConstructorOptions[] = []

        const extTab: (BaseTabComponent & { __completionNotificationEnabled?: boolean, __outputNotificationSubscription?: Subscription|null }) = tab

        if (process) {
            items.push({
                id: 'process-name',
                enabled: false,
                label: 'Current process: ' + process.name,
            })
            items.push({
                label: 'Notify when done',
                type: 'checkbox',
                checked: extTab.__completionNotificationEnabled,
                click: () => this.zone.run(() => {
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
                }),
            })
        }
        items.push({
            label: 'Notify on activity',
            type: 'checkbox',
            checked: !!extTab.__outputNotificationSubscription,
            click: () => this.zone.run(() => {
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
            }),
        })
        return items
    }
}
