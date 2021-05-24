import { Injectable, NgZone, Optional, Inject } from '@angular/core'
import { BaseTabComponent, TabContextMenuItemProvider, TabHeaderComponent, NotificationsService, MenuItemOptions } from 'terminus-core'
import { BaseTerminalTabComponent } from './api/baseTerminalTab.component'
import { TerminalContextMenuItemProvider } from './api/contextMenuProvider'

/** @hidden */
@Injectable()
export class CopyPasteContextMenu extends TabContextMenuItemProvider {
    weight = -10

    constructor (
        private zone: NgZone,
        private notifications: NotificationsService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent, tabHeader?: TabHeaderComponent): Promise<MenuItemOptions[]> {
        if (tabHeader) {
            return []
        }
        if (tab instanceof BaseTerminalTabComponent) {
            return [
                {
                    label: 'Copy',
                    click: (): void => {
                        this.zone.run(() => {
                            setTimeout(() => {
                                tab.frontend?.copySelection()
                                this.notifications.notice('Copied')
                            })
                        })
                    },
                },
                {
                    label: 'Paste',
                    click: (): void => {
                        this.zone.run(() => tab.paste())
                    },
                },
            ]
        }
        return []
    }
}

/** @hidden */
@Injectable()
export class LegacyContextMenu extends TabContextMenuItemProvider {
    weight = 1

    constructor (
        @Optional() @Inject(TerminalContextMenuItemProvider) protected contextMenuProviders: TerminalContextMenuItemProvider[]|null,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent, _tabHeader?: TabHeaderComponent): Promise<MenuItemOptions[]> {
        if (!this.contextMenuProviders) {
            return []
        }
        if (tab instanceof BaseTerminalTabComponent) {
            let items: MenuItemOptions[] = []
            for (const p of this.contextMenuProviders) {
                items = items.concat(await p.getItems(tab))
            }
            return items
        }
        return []
    }
}
