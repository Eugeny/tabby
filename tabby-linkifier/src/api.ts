import { BaseTerminalTabComponent } from 'tabby-terminal'

export abstract class LinkHandler {
    regex: RegExp
    priority = 1

    convert (uri: string, _tab?: BaseTerminalTabComponent): Promise<string>|string {
        return uri
    }

    verify (_uri: string, _tab?: BaseTerminalTabComponent): Promise<boolean>|boolean {
        return true
    }

    abstract handle (uri: string, tab?: BaseTerminalTabComponent): void
}
