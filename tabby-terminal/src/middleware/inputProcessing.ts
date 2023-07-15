import { SessionMiddleware } from '../api/middleware'

export interface InputProcessingOptions {
    backspace: 'ctrl-h'|'ctrl-?'|'delete'|'backspace'
}

export class InputProcessor extends SessionMiddleware {
    constructor (
        private options: InputProcessingOptions,
    ) {
        super()
    }

    feedFromTerminal (data: Buffer): void {
        if (data.length === 1 && data[0] === 0x7f) {
            if (this.options.backspace === 'ctrl-h') {
                data = Buffer.from('\x08')
            } else if (this.options.backspace === 'ctrl-?') {
                data = Buffer.from('\x7f')
            } else if (this.options.backspace === 'delete') {
                data = Buffer.from('\x1b[3~')
            } else {
                data = Buffer.from('\x7f')
            }
        }
        this.outputToSession.next(data)
    }
}
