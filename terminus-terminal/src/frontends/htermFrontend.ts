import { Frontend, SearchOptions } from './frontend'
import { hterm, preferenceManager } from './hterm'
import { getCSSFontFamily } from '../utils'

/** @hidden */
export class HTermFrontend extends Frontend {
    term: any
    io: any
    private htermIframe: HTMLElement
    private initialized = false
    private configuredFontSize = 0
    private configuredLinePadding = 0
    private configuredBackgroundColor = 'transparent'
    private zoom = 0

    attach (host: HTMLElement) {
        if (!this.initialized) {
            this.init()
            this.initialized = true
            preferenceManager.set('background-color', 'transparent')
            this.term.decorate(host)
            this.htermIframe = this.term.scrollPort_.iframe_
        } else {
            host.appendChild(this.htermIframe)
        }
    }

    getSelection (): string {
        return this.term.getSelectionText()
    }

    copySelection () {
        this.term.copySelectionToClipboard()
    }

    clearSelection () {
        this.term.getDocument().getSelection().removeAllRanges()
    }

    focus () {
        setTimeout(() => {
            this.term.scrollPort_.resize()
            this.term.scrollPort_.focus()
        }, 100)
    }

    write (data: string): void {
        this.io.writeUTF8(data)
    }

    clear (): void {
        this.term.wipeContents()
        this.term.onVTKeystroke('\f')
    }

    configure (): void {
        const config = this.configService.store

        this.configuredFontSize = config.terminal.fontSize
        this.configuredLinePadding = config.terminal.linePadding
        this.setFontSize()

        preferenceManager.set('font-family', getCSSFontFamily(config))
        preferenceManager.set('enable-bold', true)
        // preferenceManager.set('audible-bell-sound', '')
        preferenceManager.set('desktop-notification-bell', config.terminal.bell === 'notification')
        preferenceManager.set('enable-clipboard-notice', false)
        preferenceManager.set('receive-encoding', 'raw')
        preferenceManager.set('send-encoding', 'raw')
        preferenceManager.set('ctrl-plus-minus-zero-zoom', false)
        preferenceManager.set('scrollbar-visible', process.platform === 'darwin')
        preferenceManager.set('copy-on-select', config.terminal.copyOnSelect)
        preferenceManager.set('pass-meta-v', false)
        preferenceManager.set('alt-is-meta', config.terminal.altIsMeta)
        preferenceManager.set('alt-sends-what', 'browser-key')
        preferenceManager.set('alt-gr-mode', 'ctrl-alt')
        preferenceManager.set('pass-alt-number', true)
        preferenceManager.set('cursor-blink', config.terminal.cursorBlink)
        preferenceManager.set('clear-selection-after-copy', true)
        preferenceManager.set('scroll-on-output', false)
        preferenceManager.set('scroll-on-keystroke', config.terminal.scrollOnInput)

        if (config.terminal.colorScheme.foreground) {
            preferenceManager.set('foreground-color', config.terminal.colorScheme.foreground)
        }

        if (config.terminal.background === 'colorScheme') {
            if (config.terminal.colorScheme.background) {
                preferenceManager.set('background-color', config.terminal.colorScheme.background)
            }
        } else {
            preferenceManager.set('background-color', config.appearance.vibrancy ? 'transparent' : this.themesService.findCurrentTheme().terminalBackground)
        }

        this.configuredBackgroundColor = preferenceManager.get('background-color')

        if (!this.term) {
            return
        }

        let css = require('./hterm.userCSS.scss') // eslint-disable-line
        if (!config.terminal.ligatures) {
            css += `
                * {
                    font-feature-settings: "liga" 0;
                    font-variant-ligatures: none;
                }
            `
        } else {
            css += `
                * {
                    font-feature-settings: "liga" 1;
                    font-variant-ligatures: initial;
                }
            `
        }
        css += config.appearance.css
        this.term.setCSS(css)

        if (config.terminal.colorScheme.colors) {
            preferenceManager.set(
                'color-palette-overrides',
                Object.assign([], config.terminal.colorScheme.colors, this.term.colorPaletteOverrides)
            )
        }
        if (config.terminal.colorScheme.cursor) {
            preferenceManager.set('cursor-color', config.terminal.colorScheme.cursor)
        }

        this.term.setBracketedPaste(config.terminal.bracketedPaste)
        this.term.defaultCursorShape = {
            block: hterm.hterm.Terminal.cursorShape.BLOCK,
            underline: hterm.hterm.Terminal.cursorShape.UNDERLINE,
            beam: hterm.hterm.Terminal.cursorShape.BEAM,
        }[config.terminal.cursor]
        this.term.applyCursorShape()
        this.term.setCursorBlink(config.terminal.cursorBlink)
        if (config.terminal.cursorBlink) {
            this.term.onCursorBlink_()
        }
    }

    setZoom (zoom: number): void {
        this.zoom = zoom
        this.setFontSize()
    }

    visualBell (): void {
        preferenceManager.set('background-color', 'rgba(128,128,128,.25)')
        setTimeout(() => {
            preferenceManager.set('background-color', this.configuredBackgroundColor)
        }, 125)
    }

    scrollToBottom (): void {
        this.term.scrollEnd()
    }

    findNext (_term: string, _searchOptions?: SearchOptions): boolean {
        return false
    }

    findPrevious (_term: string, _searchOptions?: SearchOptions): boolean {
        return false
    }

    private setFontSize () {
        const size = this.configuredFontSize * Math.pow(1.1, this.zoom)
        preferenceManager.set('font-size', size)
        if (this.term) {
            setTimeout(() => {
                this.term.scrollPort_.characterSize = this.term.scrollPort_.measureCharacterSize()
                this.term.setFontSize(size)
            })
        }
    }

    private init () {
        this.term = new hterm.hterm.Terminal()
        this.term.colorPaletteOverrides = []
        this.term.onTerminalReady = () => {
            this.term.installKeyboard()
            this.term.scrollPort_.setCtrlVPaste(true)
            this.io = this.term.io.push()
            this.io.onVTKeystroke = this.io.sendString = data => this.input.next(Buffer.from(data, 'utf-8'))
            this.io.onTerminalResize = (columns, rows) => {
                this.resize.next({ columns, rows })
            }
            this.ready.next()
            this.ready.complete()

            this.term.scrollPort_.document_.addEventListener('dragOver', event => {
                this.dragOver.next(event)
            })

            this.term.scrollPort_.document_.addEventListener('drop', event => {
                this.drop.next(event)
            })
        }
        this.term.setWindowTitle = title => this.title.next(title)

        const _setAlternateMode = this.term.setAlternateMode.bind(this.term)
        this.term.setAlternateMode = (state) => {
            _setAlternateMode(state)
            this.alternateScreenActive.next(state)
        }

        this.term.primaryScreen_.syncSelectionCaret = () => null
        this.term.alternateScreen_.syncSelectionCaret = () => null
        this.term.primaryScreen_.terminal = this.term
        this.term.alternateScreen_.terminal = this.term

        this.term.scrollPort_.onPaste_ = (event) => {
            event.preventDefault()
        }

        const _resize = this.term.scrollPort_.resize.bind(this.term.scrollPort_)
        this.term.scrollPort_.resize = () => {
            if (this.enableResizing) {
                _resize()
            }
        }

        const _onMouse = this.term.onMouse_.bind(this.term)
        this.term.onMouse_ = (event) => {
            this.mouseEvent.next(event)
            if (event.type === 'mousedown' && event.which === 3) {
                event.preventDefault()
                event.stopPropagation()
                return
            }
            if (event.type === 'mousewheel' && event.altKey) {
                event.preventDefault()
            }
            _onMouse(event)
        }

        this.term.ringBell = () => this.bell.next()

        for (const screen of [this.term.primaryScreen_, this.term.alternateScreen_]) {
            const _insertString = screen.insertString.bind(screen)
            screen.insertString = (data) => {
                _insertString(data)
                this.contentUpdated.next()
            }

            const _deleteChars = screen.deleteChars.bind(screen)
            screen.deleteChars = (count) => {
                const ret = _deleteChars(count)
                this.contentUpdated.next()
                return ret
            }

            const _expandSelection = screen.expandSelection.bind(screen)
            screen.expandSelection = (selection) => {
                // Drop whitespace at the end of selection
                const range = selection.getRangeAt(0)
                if (range.endOffset > 0 && range.endContainer.nodeType === 3 && range.endContainer.textContent !== '') {
                    while (/[\s\S]+\s$/.test(range.endContainer.textContent.substr(0,range.endOffset))) {
                        range.setEnd(range.endContainer, range.endOffset - 1)
                    }
                }
                _expandSelection(selection)
            }
        }

        const _measureCharacterSize = this.term.scrollPort_.measureCharacterSize.bind(this.term.scrollPort_)
        this.term.scrollPort_.measureCharacterSize = () => {
            const size = _measureCharacterSize()
            size.height += this.configuredLinePadding
            return size
        }

        const _onCursorBlink = this.term.onCursorBlink_.bind(this.term)
        this.term.onCursorBlink_ = () => {
            this.term.cursorNode_.style.opacity = '0'
            _onCursorBlink()
        }
    }
}
