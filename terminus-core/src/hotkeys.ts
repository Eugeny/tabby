import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from './api/hotkeyProvider'

/** @hidden */
@Injectable()
export class AppHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'new-window',
            name: 'New window',
        },
        {
            id: 'toggle-window',
            name: 'Toggle terminal window',
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
            id: 'close-pane',
            name: 'Close focused pane',
        },
    ]

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
