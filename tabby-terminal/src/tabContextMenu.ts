import { Injectable, Optional, Inject } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { BaseTabComponent, TabContextMenuItemProvider, NotificationsService, MenuItemOptions, TranslateService, SplitTabComponent, PromptModalComponent, ConfigService, PartialProfile, Profile } from 'tabby-core'
import { BaseTerminalTabComponent } from './api/baseTerminalTab.component'
import { TerminalContextMenuItemProvider } from './api/contextMenuProvider'
import { MultifocusService } from './services/multifocus.service'
import { ConnectableTerminalTabComponent } from './api/connectableTerminalTab.component'
import { v4 as uuidv4 } from 'uuid'
import slugify from 'slugify'

/** @hidden */
@Injectable()
export class CopyPasteContextMenu extends TabContextMenuItemProvider {
    weight = -10

    constructor (
        private notifications: NotificationsService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent, tabHeader?: boolean): Promise<MenuItemOptions[]> {
        if (tabHeader) {
            return []
        }
        if (tab instanceof BaseTerminalTabComponent) {
            return [
                {
                    label: this.translate.instant('Copy'),
                    click: (): void => {
                        setTimeout(() => {
                            tab.frontend?.copySelection()
                            this.notifications.notice(this.translate.instant('Copied'))
                        })
                    },
                },
                {
                    label: this.translate.instant('Paste'),
                    click: () => tab.paste(),
                },
            ]
        }
        return []
    }
}

/** @hidden */
@Injectable()
export class MiscContextMenu extends TabContextMenuItemProvider {
    weight = 1

    constructor (
        private translate: TranslateService,
        private multifocus: MultifocusService,
    ) { super() }

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
        const items: MenuItemOptions[] = []
        if (tab instanceof BaseTerminalTabComponent && tab.enableToolbar && !tab.pinToolbar) {
            items.push({
                label: this.translate.instant('Show toolbar'),
                click: () => {
                    tab.pinToolbar = true
                },
            })
        }
        if (tab instanceof BaseTerminalTabComponent && tab.session?.supportsWorkingDirectory()) {
            items.push({
                label: this.translate.instant('Copy current path'),
                click: () => tab.copyCurrentPath(),
            })
        }
        items.push({
            label: this.translate.instant('Focus all tabs'),
            click: () => {
                this.multifocus.focusAllTabs()
            },
        })
        if (tab.parent instanceof SplitTabComponent && tab.parent.getAllTabs().length > 1) {
            items.push({
                label: this.translate.instant('Focus all panes'),
                click: () => {
                    this.multifocus.focusAllPanes()
                },
            })
        }
        return items
    }
}

/** @hidden */
@Injectable()
export class ReconnectContextMenu extends TabContextMenuItemProvider {
    weight = 1

    constructor (
        private translate: TranslateService,
        private notifications: NotificationsService,
    ) { super() }

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
        if (tab instanceof ConnectableTerminalTabComponent) {
            return [
                {
                    label: this.translate.instant('Disconnect'),
                    click: (): void => {
                        setTimeout(() => {
                            tab.disconnect()
                            this.notifications.notice(this.translate.instant('Disconnect'))
                        })
                    },
                },
                {
                    label: this.translate.instant('Reconnect'),
                    click: (): void => {
                        setTimeout(() => {
                            tab.reconnect()
                            this.notifications.notice(this.translate.instant('Reconnect'))
                        })
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

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
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

/** @hidden */
@Injectable()
export class SaveAsProfileContextMenu extends TabContextMenuItemProvider {
    constructor (
        private config: ConfigService,
        private ngbModal: NgbModal,
        private notifications: NotificationsService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
        if (tab instanceof BaseTerminalTabComponent) {
            return [
                {
                    label: this.translate.instant('Save as profile'),
                    click: async () => {
                        const modal = this.ngbModal.open(PromptModalComponent)
                        modal.componentInstance.prompt = this.translate.instant('New profile name')
                        modal.componentInstance.value = tab.profile.name
                        const name = (await modal.result.catch(() => null))?.value
                        if (!name) {
                            return
                        }

                        const options = JSON.parse(JSON.stringify(tab.profile.options))

                        const cwd = await tab.session?.getWorkingDirectory() ?? tab.profile.options.cwd
                        if (cwd) {
                            options.cwd = cwd
                        }

                        const profile: PartialProfile<Profile> = {
                            type: tab.profile.type,
                            name,
                            options,
                        }

                        profile.id = `${profile.type}:custom:${slugify(name)}:${uuidv4()}`
                        profile.group = tab.profile.group
                        profile.icon = tab.profile.icon
                        profile.color = tab.profile.color
                        profile.disableDynamicTitle = tab.profile.disableDynamicTitle
                        profile.behaviorOnSessionEnd = tab.profile.behaviorOnSessionEnd

                        this.config.store.profiles = [
                            ...this.config.store.profiles,
                            profile,
                        ]
                        this.config.save()
                        this.notifications.info(this.translate.instant('Saved'))
                    },
                },
            ]
        }

        return []
    }
}
