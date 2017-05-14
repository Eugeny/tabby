import { Observable } from 'rxjs'
import { Inject, Injectable } from '@angular/core'
import { TerminalDecorator, TerminalTabComponent } from 'terminus-terminal'

import { LinkHandler } from './api'

@Injectable()
export class LinkHighlighterDecorator extends TerminalDecorator {
    constructor (@Inject(LinkHandler) private handlers: LinkHandler[]) {
        super()
    }

    attach (terminal: TerminalTabComponent): void {
        return
        terminal.contentUpdated$
            .throttle(() => Observable.from([500]))
            .subscribe(() => {
                //this.insertLinks(terminal.hterm.screen_)
            })
    }

    insertLinks (screen) {
        if ('#text' === screen.cursorNode_.nodeName) {
            // replace text node to element
            const cursorNode = document.createElement('span')
            cursorNode.textContent = screen.cursorNode_.textContent
            screen.cursorRowNode_.replaceChild(cursorNode, screen.cursorNode_)
            screen.cursorNode_ = cursorNode
        }

        const traverse = (parentNode: Node) => {
            Array.from(parentNode.childNodes).forEach((node) => {
                if (node.nodeName === '#text') {
                    parentNode.replaceChild(this.urlizeNode(node), node)
                } else if (node.nodeName !== 'A') {
                    traverse(node)
                }
            })
        }

        screen.rowsArray.forEach((x) => traverse(x))
    }

    urlizeNode (node) {
        let matches = []
        this.handlers.forEach((handler) => {
            let regex = new RegExp(handler.regex, 'gi')
            while (true) {
                let match = regex.exec(node.textContent)
                if (!match) {
                    break
                }
                let uri = handler.convert(match[0])
                if (!handler.verify(uri)) {
                    continue
                }
                matches.push({
                    start: regex.lastIndex - match[0].length,
                    end: regex.lastIndex,
                    text: match[0],
                    uri,
                    handler
                })
            }
        })

        if (matches.length === 0) {
            return node
        }

        matches.sort((a, b) => a.start < b.start ? -1 : 1)

        let span = document.createElement('span')
        let position = 0
        matches.forEach((match) => {
            if (match.start < position) {
                return
            }
            if (match.start > position) {
                span.appendChild(document.createTextNode(node.textContent.slice(position, match.start)))
            }

            let a = document.createElement('a')
            a.textContent = match.text
            a.addEventListener('click', () => {
                match.handler.handle(match.uri)
            })
            span.appendChild(a)

            position = match.end
        })
        span.appendChild(document.createTextNode(node.textContent.slice(position)))
        return span
    }
}
