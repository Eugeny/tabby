/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Component, Input } from '@angular/core'
import { StreamProcessingOptions } from '../middleware/streamProcessing'

/** @hidden */
@Component({
    selector: 'stream-processing-settings',
    templateUrl: './streamProcessingSettings.component.pug',
})
export class StreamProcessingSettingsComponent {
    @Input() options: StreamProcessingOptions

    inputModes = [
        {
            key: null,
            name: _('Normal'),
            description: _('Input is sent as you type'),
        },
        {
            key: 'local-echo',
            name: _('Local echo'),
            description: _('Immediately echoes your input locally'),
        },
        {
            key: 'readline',
            name: _('Line by line'),
            description: _('Line editor, input is sent after you press Enter'),
        },
        {
            key: 'readline-hex',
            name: _('Hexadecimal'),
            description: _('Send bytes by typing in hex values'),
        },
    ]

    outputModes = [
        {
            key: null,
            name: _('Normal'),
            description: _('Output is shown as it is received'),
        },
        {
            key: 'hex',
            name: _('Hexadecimal'),
            description: _('Output is shown as a hexdump'),
        },
    ]

    newlineModes = [
        { key: null, name: _('Keep') },
        { key: 'strip', name: _('Strip') },
        { key: 'cr', name: _('Force CR') },
        { key: 'lf', name: _('Force LF') },
        { key: 'crlf', name: _('Force CRLF') },
        { key: 'implicit_cr', name: _('Implicit CR in every LF') },
        { key: 'implicit_lf', name: _('Implicit LF in every CR') },
    ]

    getInputModeName (key) {
        return this.inputModes.find(x => x.key === key)?.name
    }

    getOutputModeName (key) {
        return this.outputModes.find(x => x.key === key)?.name
    }

    setInputMode (mode) {
        this.options.inputMode = mode
    }

    setOutputMode (mode) {
        this.options.outputMode = mode
    }
}
