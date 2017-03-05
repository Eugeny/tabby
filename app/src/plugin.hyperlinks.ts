import * as fs from 'fs'
import { ElectronService } from 'services/electron'


abstract class Handler {
    constructor (protected plugin) { }
    regex: string
    convert (uri: string): string { return uri }
    verify (_uri: string): boolean { return true }
    abstract handle (uri: string): void
}

class URLHandler extends Handler {
    regex = 'http(s)?://[^\\s;\'"]+[^.,;\\s]'

    handle (uri: string) {
        this.plugin.electron.shell.openExternal(uri)
    }
}

class FileHandler extends Handler {
    regex = '/[^\\s.,;\'"]+'

    verify (uri: string) {
        return fs.existsSync(uri)
    }

    handle (uri: string) {
        this.plugin.electron.shell.openExternal('file://' + uri)
    }
}

export default class HyperlinksPlugin {
    handlers = []
    handlerClasses = [
        URLHandler,
        FileHandler,
    ]
    electron: ElectronService

    constructor ({ electron }) {
        this.electron = electron
        this.handlers = this.handlerClasses.map((x) => new x(this))
    }

    preTerminalInit ({ terminal }) {
        const oldInsertString = terminal.screen_.constructor.prototype.insertString
        const oldDeleteChars = terminal.screen_.constructor.prototype.deleteChars
        terminal.screen_.insertString = (...args) => {
            let ret = oldInsertString.bind(terminal.screen_)(...args)
            this.insertLinks(terminal.screen_)
            return ret
        }
        terminal.screen_.deleteChars = (...args) => {
            let ret = oldDeleteChars.bind(terminal.screen_)(...args)
            this.insertLinks(terminal.screen_)
            return ret
        }
    }

    insertLinks (screen) {
        const traverse = (parentNode: Node) => {
            Array.from(parentNode.childNodes).forEach((node) => {
                if (node.nodeName == '#text') {
                    parentNode.replaceChild(this.urlizeNode(node), node)
                } else if (node.nodeName != 'A') {
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
            let match
            while (match = regex.exec(node.textContent)) {
                let uri = handler.convert(match[0])
                if (!handler.verify(uri)) {
                    continue;
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

        if (matches.length == 0) {
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
