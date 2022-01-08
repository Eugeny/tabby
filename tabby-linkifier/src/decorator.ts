import { Inject, Injectable } from '@angular/core'
import { ConfigService, PlatformService, TranslateService } from 'tabby-core'
import { TerminalDecorator, BaseTerminalTabComponent } from 'tabby-terminal'

import { LinkHandler } from './api'

@Injectable()
export class LinkHighlighterDecorator extends TerminalDecorator {
    constructor (
        private config: ConfigService,
        private platform: PlatformService,
        private translate: TranslateService,
        @Inject(LinkHandler) private handlers: LinkHandler[],
    ) {
        super()
    }

    attach (tab: BaseTerminalTabComponent): void {
        if (!(tab.frontend as any).xterm) {
            // not hterm
            return
        }

        for (const handler of this.handlers) {
            const getLink = async uri => handler.convert(uri, tab)
            const openLink = async uri => handler.handle(await getLink(uri), tab)

            ;(tab.frontend as any).xterm.registerLinkMatcher(
                handler.regex,
                (event: MouseEvent, uri: string) => {
                    if (!this.willHandleEvent(event)) {
                        return
                    }
                    openLink(uri)
                },
                {
                    priority: handler.priority,
                    validationCallback: async (uri: string, callback: (isValid: boolean) => void) => {
                        callback(await handler.verify(await handler.convert(uri, tab), tab))
                    },
                    willLinkActivate: (event: MouseEvent, uri: string) => {
                        if (event.button === 2) {
                            this.platform.popupContextMenu([
                                {
                                    click: () => openLink(uri),
                                    label: this.translate.instant('Open'),
                                },
                                {
                                    click: async () => {
                                        this.platform.setClipboard({ text: await getLink(uri) })
                                    },
                                    label: this.translate.instant('Copy'),
                                },
                            ])
                            return false
                        }
                        return this.willHandleEvent(event)
                    },
                }
            )
        }
    }

    private willHandleEvent (event: MouseEvent) {
        const modifier = this.config.store.clickableLinks.modifier
        return !modifier || event[modifier]
    }
}
