import { Injectable } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { ProfilesService } from './services/profiles.service'
import { HotkeyDescription, HotkeyProvider } from './api/hotkeyProvider'

/** @hidden */
@Injectable()
export class AppHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'command-selector',
            name: this.translate.instant('Show command selector'),
        },
        {
            id: 'profile-selector',
            name: this.translate.instant('Show profile selector'),
        },
        {
            id: 'toggle-fullscreen',
            name: this.translate.instant('Toggle fullscreen mode'),
        },
        {
            id: 'rename-tab',
            name: this.translate.instant('Rename tab'),
        },
        {
            id: 'close-tab',
            name: this.translate.instant('Close tab'),
        },
        {
            id: 'reopen-tab',
            name: this.translate.instant('Reopen last tab'),
        },
        {
            id: 'toggle-last-tab',
            name: this.translate.instant('Toggle last tab'),
        },
        {
            id: 'next-tab',
            name: this.translate.instant('Next tab'),
        },
        {
            id: 'previous-tab',
            name: this.translate.instant('Previous tab'),
        },
        {
            id: 'move-tab-left',
            name: this.translate.instant('Move tab to the left'),
        },
        {
            id: 'move-tab-right',
            name: this.translate.instant('Move tab to the right'),
        },
        {
            id: 'rearrange-panes',
            name: this.translate.instant('Show pane labels (for rearranging)'),
        },
        {
            id: 'duplicate-tab',
            name: this.translate.instant('Duplicate tab'),
        },
        {
            id: 'restart-tab',
            name: this.translate.instant('Restart tab'),
        },
        {
            id: 'explode-tab',
            name: this.translate.instant('Turn current tab\'s panes into separate tabs'),
        },
        {
            id: 'combine-tabs',
            name: this.translate.instant('Combine all tabs into the current tab'),
        },
        {
            id: 'tab-1',
            name: this.translate.instant('Tab {number}', { number: 1 }),
        },
        {
            id: 'tab-2',
            name: this.translate.instant('Tab {number}', { number: 2 }),
        },
        {
            id: 'tab-3',
            name: this.translate.instant('Tab {number}', { number: 3 }),
        },
        {
            id: 'tab-4',
            name: this.translate.instant('Tab {number}', { number: 4 }),
        },
        {
            id: 'tab-5',
            name: this.translate.instant('Tab {number}', { number: 5 }),
        },
        {
            id: 'tab-6',
            name: this.translate.instant('Tab {number}', { number: 6 }),
        },
        {
            id: 'tab-7',
            name: this.translate.instant('Tab {number}', { number: 7 }),
        },
        {
            id: 'tab-8',
            name: this.translate.instant('Tab {number}', { number: 8 }),
        },
        {
            id: 'tab-9',
            name: this.translate.instant('Tab {number}', { number: 9 }),
        },
        {
            id: 'tab-10',
            name: this.translate.instant('Tab {number}', { number: 10 }),
        },
        {
            id: 'tab-11',
            name: this.translate.instant('Tab {number}', { number: 11 }),
        },
        {
            id: 'tab-12',
            name: this.translate.instant('Tab {number}', { number: 12 }),
        },
        {
            id: 'tab-13',
            name: this.translate.instant('Tab {number}', { number: 13 }),
        },
        {
            id: 'tab-14',
            name: this.translate.instant('Tab {number}', { number: 14 }),
        },
        {
            id: 'tab-15',
            name: this.translate.instant('Tab {number}', { number: 15 }),
        },
        {
            id: 'tab-16',
            name: this.translate.instant('Tab {number}', { number: 16 }),
        },
        {
            id: 'tab-17',
            name: this.translate.instant('Tab {number}', { number: 17 }),
        },
        {
            id: 'tab-18',
            name: this.translate.instant('Tab {number}', { number: 18 }),
        },
        {
            id: 'tab-19',
            name: this.translate.instant('Tab {number}', { number: 19 }),
        },
        {
            id: 'tab-20',
            name: this.translate.instant('Tab {number}', { number: 20 }),
        },
        {
            id: 'split-right',
            name: this.translate.instant('Split to the right'),
        },
        {
            id: 'split-bottom',
            name: this.translate.instant('Split to the bottom'),
        },
        {
            id: 'split-left',
            name: this.translate.instant('Split to the left'),
        },
        {
            id: 'split-top',
            name: this.translate.instant('Split to the top'),
        },
        {
            id: 'pane-maximize',
            name: this.translate.instant('Maximize the active pane'),
        },
        {
            id: 'pane-nav-up',
            name: this.translate.instant('Focus the pane above'),
        },
        {
            id: 'pane-nav-down',
            name: this.translate.instant('Focus the pane below'),
        },
        {
            id: 'pane-nav-left',
            name: this.translate.instant('Focus the pane on the left'),
        },
        {
            id: 'pane-nav-right',
            name: this.translate.instant('Focus the pane on the right'),
        },
        {
            id: 'pane-nav-previous',
            name: this.translate.instant('Focus previous pane'),
        },
        {
            id: 'pane-nav-next',
            name: this.translate.instant('Focus next pane'),
        },
        {
            id: 'pane-nav-1',
            name: this.translate.instant('Focus pane {number}', { number: 1 }),
        },
        {
            id: 'pane-nav-2',
            name: this.translate.instant('Focus pane {number}', { number: 2 }),
        },
        {
            id: 'pane-nav-3',
            name: this.translate.instant('Focus pane {number}', { number: 3 }),
        },
        {
            id: 'pane-nav-4',
            name: this.translate.instant('Focus pane {number}', { number: 4 }),
        },
        {
            id: 'pane-nav-5',
            name: this.translate.instant('Focus pane {number}', { number: 5 }),
        },
        {
            id: 'pane-nav-6',
            name: this.translate.instant('Focus pane {number}', { number: 6 }),
        },
        {
            id: 'pane-nav-7',
            name: this.translate.instant('Focus pane {number}', { number: 7 }),
        },
        {
            id: 'pane-nav-8',
            name: this.translate.instant('Focus pane {number}', { number: 8 }),
        },
        {
            id: 'pane-nav-9',
            name: this.translate.instant('Focus pane {number}', { number: 9 }),
        },
        {
            id: 'switch-profile',
            name: this.translate.instant('Switch profile in the active pane'),
        },
        {
            id: 'close-pane',
            name: this.translate.instant('Close focused pane'),
        },
        {
            id: 'pane-increase-vertical',
            name: this.translate.instant('Increase vertical split size'),
        },
        {
            id: 'pane-decrease-vertical',
            name: this.translate.instant('Decrease vertical split size'),
        },
        {
            id: 'pane-increase-horizontal',
            name: this.translate.instant('Increase horizontal split size'),
        },
        {
            id: 'pane-decrease-horizontal',
            name: this.translate.instant('Decrease horizontal split size'),
        },
    ]

    constructor (
        private profilesService: ProfilesService,
        private translate: TranslateService,
    ) { super() }

    async provide (): Promise<HotkeyDescription[]> {
        const profiles = await this.profilesService.getProfiles()
        const groups = await this.profilesService.getProfileGroups()
        return [
            ...this.hotkeys,
            ...profiles.map(profile => ({
                id: `profile.${ProfilesService.getProfileHotkeyName(profile)}`,
                name: this.translate.instant('New tab: {profile}', { profile: profile.name }),
            })),
            ...this.profilesService.getProviders().map(provider => ({
                id: `profile-selectors.${provider.id}`,
                name: this.translate.instant('Show {type} profile selector', { type: provider.name }),
            })),
            ...groups.map(group => ({
                id: `group-selectors.${group.id}`,
                name: this.translate.instant('Show profile selector for group {name}', { name: group.name }),
            })),
        ]
    }

}
