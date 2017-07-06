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
    ]
}
