import { Inject, Injectable } from '@angular/core'
import { ConfigService, PlatformService } from 'tabby-core'
import { TerminalDecorator, BaseTerminalTabComponent, XTermFrontend } from 'tabby-terminal'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { LinkHandler } from './api'

@Injectable()
export class LinkHighlighterDecorator extends TerminalDecorator {
    constructor (
        private config: ConfigService,
        private platform: PlatformService,
        @Inject(LinkHandler) private handlers: LinkHandler[],
    ) {
        super()
    }

    attach (tab: BaseTerminalTabComponent): void {
        if (!(tab.frontend instanceof XTermFrontend)) {
            // not xterm
            return
        }

        tab.frontend.xterm.options.linkHandler = {
            activate: (event, uri) => {
                if (!this.willHandleEvent(event)) {
                    return
                }
                this.platform.openExternal(uri)
            },
        }

        for (const handler of this.handlers) {
            const getLink = async uri => handler.convert(uri, tab)
            const openLink = async uri => handler.handle(await getLink(uri), tab)

            const addon = new WebLinksAddon(
                async (event, uri) => {
                    if (!this.willHandleEvent(event)) {
                        return
                    }
                    if (!await handler.verify(await handler.convert(uri, tab), tab)) {
                        return
                    }
                    openLink(uri)
                },
                {
                    urlRegex: handler.regex,
                },
            )

            tab.frontend.xterm.loadAddon(addon)
        }
    }

    private willHandleEvent (event: MouseEvent) {
        const modifier = this.config.store.clickableLinks.modifier
        return !modifier || event[modifier]
    }
}
