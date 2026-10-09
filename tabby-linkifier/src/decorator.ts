import { Inject, Injectable } from '@angular/core'
import { ConfigService, PlatformService } from 'tabby-core'
import { TerminalDecorator, BaseTerminalTabComponent, XTermFrontend } from 'tabby-terminal'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { LinkHandler } from './api'

function parseURL (uri: string): URL|null {
    try {
        return new URL(uri)
    } catch {
        return null
    }
}

@Injectable()
export class LinkHighlighterDecorator extends TerminalDecorator {
    constructor (
        private config: ConfigService,
        private platform: PlatformService,
        @Inject(LinkHandler) private handlers: LinkHandler[],
    ) {
        super()
    }

    attach (tab: BaseTerminalTabComponent<any>): void {
        if (!(tab.frontend instanceof XTermFrontend)) {
            // not xterm
            return
        }

        tab.frontend.xterm.options.linkHandler = {
            allowNonHttpProtocols: true,
            activate: (event, uri) => {
                if (!this.willHandleEvent(event)) {
                    return
                }
                const url = parseURL(uri)
                if (!url) {
                    return
                }
                // A file: URL with a host is a UNC path - opening it would reach out
                // over SMB to a server the remote side chose. Only allow local files.
                const isLocalFile = url.protocol === 'file:' && !url.host
                if (!['http:', 'https:'].includes(url.protocol) && !isLocalFile) {
                    return
                }
                this.platform.openExternal(url.href)
            },
        }

        const openLink = async uri => {
            for (const handler of this.handlers) {
                if (!handler.fullMatchRegex.test(uri)) {
                    continue
                }
                if (!await handler.verify(await handler.convert(uri, tab), tab)) {
                    continue
                }
                handler.handle(await handler.convert(uri, tab), tab)
                return
            }
        }

        let regex = new RegExp('')
        const regexSource = this.handlers.map(x => `(${x.regex.source})`).join('|')
        try {
            regex = new RegExp(regexSource)
            console.debug('Linkifier regexp', regex)
        } catch (error) {
            console.error('Could not build regex for your link handlers:', error)
            console.error('Regex source was:', regexSource)
            return
        }

        const addon = new WebLinksAddon(
            async (event, uri) => {
                if (!this.willHandleEvent(event)) {
                    return
                }
                openLink(uri)
            },
            {
                urlRegex: regex,
            },
        )

        tab.frontend.xterm.loadAddon(addon)
    }

    private willHandleEvent (event: MouseEvent) {
        const modifier = this.config.store.clickableLinks.modifier
        return !modifier || event[modifier]
    }
}
