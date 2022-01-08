import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider, TranslateService } from 'tabby-core'

/** @hidden */
@Injectable()
export class TerminalHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'copy',
            name: this.translate.instant('Copy to clipboard'),
        },
        {
            id: 'paste',
            name: this.translate.instant('Paste from clipboard'),
        },
        {
            id: 'home',
            name: this.translate.instant('Beginning of the line'),
        },
        {
            id: 'end',
            name: this.translate.instant('End of the line'),
        },
        {
            id: 'previous-word',
            name: this.translate.instant('Jump to previous word'),
        },
        {
            id: 'next-word',
            name: this.translate.instant('Jump to next word'),
        },
        {
            id: 'delete-previous-word',
            name: this.translate.instant('Delete previous word'),
        },
        {
            id: 'delete-next-word',
            name: this.translate.instant('Delete next word'),
        },
        {
            id: 'clear',
            name: this.translate.instant('Clear terminal'),
        },
        {
            id: 'zoom-in',
            name: this.translate.instant('Zoom in'),
        },
        {
            id: 'zoom-out',
            name: this.translate.instant('Zoom out'),
        },
        {
            id: 'reset-zoom',
            name: this.translate.instant('Reset zoom'),
        },
        {
            id: 'ctrl-c',
            name: this.translate.instant('Intelligent Ctrl-C (copy/abort)'),
        },
        {
            id: 'copy-current-path',
            name: this.translate.instant('Copy current path'),
        },
        {
            id: 'search',
            name: this.translate.instant('Search'),
        },
        {
            id: 'pane-focus-all',
            name: this.translate.instant('Focus all panes at once (broadcast)'),
        },
        {
            id: 'scroll-to-bottom',
            name: this.translate.instant('Scroll terminal to bottom'),
        },
    ]

    constructor (private translate: TranslateService) { super() }

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
