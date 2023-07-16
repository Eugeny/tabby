/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Component, Input } from '@angular/core'
import { InputProcessingOptions } from '../middleware/inputProcessing'

/** @hidden */
@Component({
    selector: 'input-processing-settings',
    templateUrl: './inputProcessingSettings.component.pug',
})
export class InputProcessingSettingsComponent {
    @Input() options: InputProcessingOptions

    backspaceModes = [
        {
            key: 'backspace',
            name: _('Pass-through'),
        },
        {
            key: 'ctrl-h',
            name: 'Ctrl-H',
        },
        {
            key: 'ctrl-?',
            name: 'Ctrl-?',
        },
        {
            key: 'delete',
            name: 'Delete (CSI 3~)',
        },
    ]

    getBackspaceModeName (key) {
        return this.backspaceModes.find(x => x.key === key)?.name
    }

    setBackspaceMode (mode) {
        this.options.backspace = mode
    }
}
