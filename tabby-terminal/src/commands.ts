/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import slugify from 'slugify'
import { v4 as uuidv4 } from 'uuid'

import { CommandProvider, Command, CommandLocation, TranslateService, CommandContext, PromptModalComponent, PartialProfile, Profile, ConfigService, NotificationsService, SplitTabComponent } from 'tabby-core'

import { ConnectableTerminalTabComponent } from './api/connectableTerminalTab.component'
import { BaseTerminalTabComponent } from './api/baseTerminalTab.component'
import { MultifocusService } from './services/multifocus.service'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class TerminalCommandProvider extends CommandProvider {
    constructor (
        private config: ConfigService,
        private ngbModal: NgbModal,
        private notifications: NotificationsService,
        private translate: TranslateService,
        private multifocus: MultifocusService,
    ) {
        super()
    }

    async provide (context: CommandContext): Promise<Command[]> {
        const commands: Command[] = []
        const tab = context.tab
        if (!tab) {
            return []
        }

        if (tab instanceof BaseTerminalTabComponent && tab.enableToolbar && !tab.pinToolbar) {
            commands.push({
                id: 'terminal:show-toolbar',
                group: 'terminal:misc',
                label: this.translate.instant('Show toolbar'),
                locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
                run: async () => {
                    tab.pinToolbar = true
                },
            })
        }
        if (tab instanceof BaseTerminalTabComponent && tab.session?.supportsWorkingDirectory()) {
            commands.push({
                id: 'terminal:copy-current-path',
                group: 'terminal:misc',
                label: this.translate.instant('Copy current path'),
                locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
                run: async () => tab.copyCurrentPath(),
            })
        }
        commands.push({
            id: 'terminal:focus-all-tabs',
            group: 'core:panes',
            label: this.translate.instant('Focus all tabs'),
            locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
            run: async () => {
                this.multifocus.focusAllTabs()
            },
        })

        let splitTab: SplitTabComponent|null = null
        if (tab.parent instanceof SplitTabComponent) {
            splitTab = tab.parent
        }
        if (tab instanceof SplitTabComponent) {
            splitTab = tab
        }

        if (splitTab && splitTab.getAllTabs().length > 1) {
            commands.push({
                id: 'terminal:focus-all-panes',
                group: 'terminal:misc',
                label: this.translate.instant('Focus all panes'),
                locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
                run: async () => {
                    this.multifocus.focusAllPanes()
                },
            })
        }

        if (tab instanceof BaseTerminalTabComponent) {
            commands.push({
                id: 'terminal:save-as-profile',
                group: 'terminal:misc',
                label: this.translate.instant('Save as profile'),
                locations: [CommandLocation.TabBodyMenu, CommandLocation.TabHeaderMenu],
                run: async () => {
                    const modal = this.ngbModal.open(PromptModalComponent)
                    modal.componentInstance.prompt = this.translate.instant('New profile name')
                    modal.componentInstance.value = tab.profile.name
                    const name = (await modal.result.catch(() => null))?.value
                    if (!name) {
                        return
                    }

                    const options = {
                        ...tab.profile.options,
                    }

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
            })
        }

        if (tab instanceof ConnectableTerminalTabComponent) {
            commands.push({
                id: 'terminal:disconnect',
                label: this.translate.instant('Disconnect'),
                group: 'terminal:connection',
                locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
                run: async () => {
                    setTimeout(() => {
                        tab.disconnect()
                        this.notifications.notice(this.translate.instant('Disconnect'))
                    })
                },
            })
            commands.push({
                id: 'terminal:reconnect',
                label: this.translate.instant('Reconnect'),
                group: 'terminal:connection',
                locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
                run: async () => {
                    setTimeout(() => {
                        tab.reconnect()
                        this.notifications.notice(this.translate.instant('Reconnect'))
                    })
                },
            })
        }

        if (tab instanceof BaseTerminalTabComponent) {
            commands.push({
                id: 'terminal:copy',
                label: this.translate.instant('Copy'),
                locations: [CommandLocation.TabBodyMenu],
                weight: -2,
                run: async () => {
                    setTimeout(() => {
                        tab.frontend?.copySelection()
                        this.notifications.notice(this.translate.instant('Copied'))
                    })
                },
            })
            commands.push({
                id: 'terminal:paste',
                label: this.translate.instant('Paste'),
                locations: [CommandLocation.TabBodyMenu],
                weight: -1,
                run: async () => tab.paste(),
            })
        }
        return commands
    }
}
