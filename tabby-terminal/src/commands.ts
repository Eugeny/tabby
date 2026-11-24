/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Inject, Injectable, Optional } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import slugify from 'slugify'
import { v4 as uuidv4 } from 'uuid'

import { CommandProvider, Command, CommandLocation, TranslateService, CommandContext, PromptModalComponent, PartialProfile, Profile, ConfigService, NotificationsService, SplitTabComponent, HostAppService, Platform } from 'tabby-core'

import { ConnectableTerminalTabComponent } from './api/connectableTerminalTab.component'
import { BaseTerminalTabComponent } from './api/baseTerminalTab.component'
import { TerminalContextMenuItemProvider } from './api/contextMenuProvider'
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
        private hostApp: HostAppService,
        @Optional() @Inject(TerminalContextMenuItemProvider) private legacyProviders: TerminalContextMenuItemProvider[]|null,
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
        if (tab instanceof BaseTerminalTabComponent) {
            commands.push({
                id: 'terminal:copy-current-path',
                group: 'terminal:misc',
                label: this.translate.instant('Copy current path'),
                // Always runnable: copyCurrentPath() explains when the shell doesn't support it
                locations: tab.session?.supportsWorkingDirectory() ? [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu] : [],
                hotkey: 'copy-current-path',
                run: async () => tab.copyCurrentPath(),
            })
        }
        commands.push({
            id: 'terminal:focus-all-tabs',
            group: 'core:panes',
            label: this.translate.instant('Focus all tabs'),
            locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
            hotkey: 'focus-all-tabs',
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
                hotkey: 'pane-focus-all',
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
            })
        }

        if (tab instanceof ConnectableTerminalTabComponent) {
            commands.push({
                id: 'terminal:disconnect',
                label: this.translate.instant('Disconnect'),
                group: 'terminal:connection',
                locations: [CommandLocation.TabHeaderMenu, CommandLocation.TabBodyMenu],
                hotkey: 'disconnect-tab',
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
                hotkey: 'reconnect-tab',
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
                hotkey: 'copy',
                run: async () => {
                    setTimeout(() => {
                        tab.frontend?.copySelection()
                        tab.frontend?.clearSelection()
                        this.notifications.notice(this.translate.instant('Copied'))
                    })
                },
            })
            commands.push({
                id: 'terminal:paste',
                label: this.translate.instant('Paste'),
                locations: [CommandLocation.TabBodyMenu],
                weight: -1,
                hotkey: 'paste',
                run: async () => tab.forEachFocusedTerminalPane(t => t.paste()),
            })

            const actions: [string, string, () => any][] = [
                ['search', this.translate.instant('Search'), () => tab.showSearch()],
                ['select-all', this.translate.instant('Select all'), () => tab.frontend?.selectAll()],
                ['clear', this.translate.instant('Clear terminal'), () => tab.forEachFocusedTerminalPane(t => this.clear(t))],
                ['zoom-in', this.translate.instant('Zoom in'), () => tab.forEachFocusedTerminalPane(t => t.zoomIn())],
                ['zoom-out', this.translate.instant('Zoom out'), () => tab.forEachFocusedTerminalPane(t => t.zoomOut())],
                ['reset-zoom', this.translate.instant('Reset zoom'), () => tab.forEachFocusedTerminalPane(t => t.resetZoom())],
                ['scroll-to-top', this.translate.instant('Scroll terminal to top'), () => tab.frontend?.scrollToTop()],
                ['scroll-page-up', this.translate.instant('Scroll terminal one page up'), () => tab.frontend?.scrollPages(-1)],
                ['scroll-page-down', this.translate.instant('Scroll terminal one page down'), () => tab.frontend?.scrollPages(1)],
                ['scroll-to-bottom', this.translate.instant('Scroll terminal to bottom'), () => tab.frontend?.scrollToBottom()],
                ['switch-meta-option', this.translate.instant('Toggle the Option key between Meta and normal (macOS)'), () => {
                    const altIsMeta = !this.config.store.terminal.altIsMeta
                    this.config.store.terminal.altIsMeta = altIsMeta
                    this.config.save()
                    // no config.changed$ listener here - re-apply to this tab now, others on focus
                    tab.configure()
                    this.notifications.notice(this.translate.instant(
                        altIsMeta ? 'Option key now sends Meta' : 'Option key now sends its normal character',
                    ))
                }],
            ]
            for (const [hotkey, label, run] of actions) {
                commands.push({ id: `terminal:${hotkey}`, label, locations: [], hotkey, run: async () => run() })
            }

            // Deprecated TerminalContextMenuItemProvider bridge
            for (const provider of this.legacyProviders ?? []) {
                for (const item of await provider.getItems(tab)) {
                    commands.push(...Command.fromMenuItem(item))
                }
            }
        }
        return commands
    }

    private clear (tab: BaseTerminalTabComponent<any>): void {
        const shellType: string = tab.profile.options?.shellType ?? ''
        const shellArgs: string[] = tab.profile.options?.args ?? []
        if (this.hostApp.platform === Platform.Windows && (shellType === 'powershell' || shellArgs.some(arg => arg.includes('clink')))) {
            // Windows PowerShell and cmd(Clink): send Ctrl+L to PTY (natively clears)
            tab.sendInput('\x0c')
        } else {
            // Windows cmd(stock) and macOS/Linux: clear xterm buffer only
            tab.frontend?.clear()
        }
    }
}
