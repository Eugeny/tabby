import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'terminus-core'
import { TerminalService } from './services/terminal.service'

/** @hidden */
@Injectable()
export class TerminalHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'copy',
            name: 'Copy to clipboard',
        },
        {
            id: 'paste',
            name: 'Paste from clipboard',
        },
        {
            id: 'home',
            name: 'Beginning of the line',
        },
        {
            id: 'end',
            name: 'End of the line',
        },
        {
            id: 'previous-word',
            name: 'Jump to previous word',
        },
        {
            id: 'next-word',
            name: 'Jump to next word',
        },
        {
            id: 'delete-previous-word',
            name: 'Delete previous word',
        },
        {
            id: 'delete-next-word',
            name: 'Delete next word',
        },
        {
            id: 'clear',
            name: 'Clear terminal',
        },
        {
            id: 'zoom-in',
            name: 'Zoom in',
        },
        {
            id: 'zoom-out',
            name: 'Zoom out',
        },
        {
            id: 'reset-zoom',
            name: 'Reset zoom',
        },
        {
            id: 'new-tab',
            name: 'New tab',
        },
        {
            id: 'ctrl-c',
            name: 'Intelligent Ctrl-C (copy/abort)',
        },
        {
            id: 'search',
            name: 'Search',
        },
    ]

    constructor (
        private terminal: TerminalService,
    ) { super() }

    async provide (): Promise<HotkeyDescription[]> {
        const profiles = await this.terminal.getProfiles()
        return [
            ...this.hotkeys,
            ...profiles.map(profile => ({
                id: `profile.${this.terminal.getProfileID(profile)}`,
                name: `New tab: ${profile.name}`,
            })),
        ]
    }
}
