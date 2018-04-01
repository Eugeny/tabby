import { Injectable } from '@angular/core'
import { IHotkeyDescription, HotkeyProvider } from 'terminus-core'

@Injectable()
export class TerminalHotkeyProvider extends HotkeyProvider {
    hotkeys: IHotkeyDescription[] = [
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
    ]
}
