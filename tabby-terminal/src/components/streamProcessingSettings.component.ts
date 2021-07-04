/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'
import { StreamProcessingOptions } from '../api/streamProcessing'

/** @hidden */
@Component({
    selector: 'stream-processing-settings',
    template: require('./streamProcessingSettings.component.pug'),
})
export class StreamProcessingSettingsComponent {
    @Input() options: StreamProcessingOptions

    inputModes = [
        { key: null, name: 'Normal', description: 'Input is sent as you type' },
        { key: 'local-echo', name: 'Local echo', description: 'Immediately echoes your input locally' },
        { key: 'readline', name: 'Line by line', description: 'Line editor, input is sent after you press Enter' },
        { key: 'readline-hex', name: 'Hexadecimal', description: 'Send bytes by typing in hex values' },
    ]
    outputModes = [
        { key: null, name: 'Normal', description: 'Output is shown as it is received' },
        { key: 'hex', name: 'Hexadecimal', description: 'Output is shown as a hexdump' },
    ]
    newlineModes = [
        { key: null, name: 'Keep' },
        { key: 'strip', name: 'Strip' },
        { key: 'cr', name: 'Force CR' },
        { key: 'lf', name: 'Force LF' },
        { key: 'crlf', name: 'Force CRLF' },
    ]

    getInputModeName (key) {
        return this.inputModes.find(x => x.key === key)?.name
    }

    getOutputModeName (key) {
        return this.outputModes.find(x => x.key === key)?.name
    }
}
