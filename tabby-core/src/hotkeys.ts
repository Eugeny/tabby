import { Injectable } from '@angular/core'
import { ProfilesService } from './services/profiles.service'
import { HotkeyDescription, HotkeyProvider } from './api/hotkeyProvider'

/** @hidden */
@Injectable()
export class AppHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'profile-selector',
            name: 'Show profile selector',
        },
        {
            id: 'toggle-fullscreen',
            name: 'Toggle fullscreen mode',
        },
        {
            id: 'rename-tab',
            name: 'Rename Tab',
        },
        {
            id: 'close-tab',
            name: 'Close tab',
        },
        {
            id: 'reopen-tab',
            name: 'Reopen last tab',
        },
        {
            id: 'toggle-last-tab',
            name: 'Toggle last tab',
        },
        {
            id: 'next-tab',
            name: 'Next tab',
        },
        {
            id: 'previous-tab',
            name: 'Previous tab',
        },
        {
            id: 'move-tab-left',
            name: 'Move tab to the left',
        },
        {
            id: 'move-tab-right',
            name: 'Move tab to the right',
        },
        {
            id: 'tab-1',
            name: 'Tab 1',
        },
        {
            id: 'tab-2',
            name: 'Tab 2',
        },
        {
            id: 'tab-3',
            name: 'Tab 3',
        },
        {
            id: 'tab-4',
            name: 'Tab 4',
        },
        {
            id: 'tab-5',
            name: 'Tab 5',
        },
        {
            id: 'tab-6',
            name: 'Tab 6',
        },
        {
            id: 'tab-7',
            name: 'Tab 7',
        },
        {
            id: 'tab-8',
            name: 'Tab 8',
        },
        {
            id: 'tab-9',
            name: 'Tab 9',
        },
        {
            id: 'tab-10',
            name: 'Tab 10',
        },
        {
            id: 'tab-11',
            name: 'Tab 11',
        },
        {
            id: 'tab-12',
            name: 'Tab 12',
        },
        {
            id: 'tab-13',
            name: 'Tab 13',
        },
        {
            id: 'tab-14',
            name: 'Tab 14',
        },
        {
            id: 'tab-15',
            name: 'Tab 15',
        },
        {
            id: 'tab-16',
            name: 'Tab 16',
        },
        {
            id: 'tab-17',
            name: 'Tab 17',
        },
        {
            id: 'tab-18',
            name: 'Tab 18',
        },
        {
            id: 'tab-19',
            name: 'Tab 19',
        },
        {
            id: 'tab-20',
            name: 'Tab 20',
        },
        {
            id: 'split-right',
            name: 'Split to the right',
        },
        {
            id: 'split-bottom',
            name: 'Split to the bottom',
        },
        {
            id: 'split-left',
            name: 'Split to the left',
        },
        {
            id: 'split-top',
            name: 'Split to the top',
        },
        {
            id: 'pane-maximize',
            name: 'Maximize the active pane',
        },
        {
            id: 'pane-nav-up',
            name: 'Focus the pane above',
        },
        {
            id: 'pane-nav-down',
            name: 'Focus the pane below',
        },
        {
            id: 'pane-nav-left',
            name: 'Focus the pane on the left',
        },
        {
            id: 'pane-nav-right',
            name: 'Focus the pane on the right',
        },
        {
            id: 'pane-nav-previous',
            name: 'Focus previous pane',
        },
        {
            id: 'pane-nav-next',
            name: 'Focus next pane',
        },
        {
            id: 'switch-profile',
            name: 'Switch profile in the active pane',
        },
        {
            id: 'close-pane',
            name: 'Close focused pane',
        },
    ]

    constructor (
        private profilesService: ProfilesService,
    ) { super() }

    async provide (): Promise<HotkeyDescription[]> {
        const profiles = await this.profilesService.getProfiles()
        return [
            ...this.hotkeys,
            ...profiles.map(profile => ({
                id: `profile.${profile.id}`,
                name: `New tab: ${profile.name}`,
            })),
        ]
    }
}
