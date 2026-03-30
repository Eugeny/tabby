import { BaseTerminalTabComponent } from 'tabby-terminal'

export abstract class LinkHandler {
    regex: RegExp
    priority = 1

    convert (uri: string, _tab?: BaseTerminalTabComponent<any>): Promise<string>|string {
        return uri
    }

    verify (_uri: string, _tab?: BaseTerminalTabComponent<any>): Promise<boolean>|boolean {
        return true
    }

    abstract handle (uri: string, tab?: BaseTerminalTabComponent<any>): void

    private _fullMatchRegex: RegExp | null = null
    get fullMatchRegex (): RegExp {
        if (!this._fullMatchRegex) {
            this._fullMatchRegex = new RegExp(`^${this.regex.source}$`)
        }
        return this._fullMatchRegex
    }
}
