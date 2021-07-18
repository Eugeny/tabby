/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as shellQuote from 'shell-quote'
import { Component, Input } from '@angular/core'
import { SessionOptions } from '../api'

/** @hidden */
@Component({
    selector: 'command-line-editor',
    template: require('./commandLineEditor.component.pug'),
})
export class CommandLineEditorComponent {
    @Input() argvMode = false
    @Input() _model: SessionOptions
    command = ''

    @Input() get model (): SessionOptions {
        return this._model
    }

    set model (value: SessionOptions) {
        this._model = value
        this.updateCommand()
    }

    switchToCommand () {
        this.updateCommand()
        this.argvMode = false
    }

    switchToArgv () {
        this.argvMode = true
    }

    parseCommand () {
        const args = shellQuote.parse(this.command)
        this.model.command = args[0] ?? ''
        this.model.args = args.slice(1)
    }

    updateCommand () {
        this.command = shellQuote.quote([
            this.model.command,
            ...this.model.args ?? [],
        ])
    }

    trackByIndex (index) {
        return index
    }
}
