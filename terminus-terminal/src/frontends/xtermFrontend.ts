import { Frontend, SearchOptions } from './frontend'
import { Terminal, ITheme } from 'xterm'
import { getCSSFontFamily } from '../utils'
import { FitAddon } from 'xterm-addon-fit'
import { LigaturesAddon } from 'xterm-addon-ligatures'
import { SearchAddon } from 'xterm-addon-search'
import { WebglAddon } from 'xterm-addon-webgl'
import './xterm.css'
import deepEqual from 'deep-equal'
import { Attributes } from 'xterm/src/common/buffer/Constants'
import { AttributeData } from 'xterm/src/common/buffer/AttributeData'
import { CellData } from 'xterm/src/common/buffer/CellData'

const COLOR_NAMES = [
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
]

/** @hidden */
export class XTermFrontend extends Frontend {
    enableResizing = true
    protected xtermCore: any
    protected enableWebGL = false
    private xterm: Terminal
    private configuredFontSize = 0
    private zoom = 0
    private resizeHandler: () => void
    private configuredTheme: ITheme = {}
    private copyOnSelect = false
    private search = new SearchAddon()
    private fitAddon = new FitAddon()
    private ligaturesAddon: LigaturesAddon
    private opened = false

    constructor () {
        super()
        this.xterm = new Terminal({
            allowTransparency: true,
        })
        this.xtermCore = (this.xterm as any)._core

        this.xterm.onBinary(data => {
            this.input.next(Buffer.from(data, 'binary'))
        })
        this.xterm.onData(data => {
            this.input.next(Buffer.from(data, 'utf-8'))
        })
        this.xterm.onResize(({ cols, rows }) => {
            this.resize.next({ rows, columns: cols })
        })
        this.xterm.onTitleChange(title => {
            this.title.next(title)
        })
        this.xterm.onSelectionChange(() => {
            if (this.copyOnSelect && this.getSelection()) {
                this.copySelection()
            }
        })
        this.xterm.loadAddon(this.fitAddon)

        const keyboardEventHandler = (name: string, event: KeyboardEvent) => {
            this.hotkeysService.pushKeystroke(name, event)
            let ret = true
            if (this.hotkeysService.getCurrentPartiallyMatchedHotkeys().length !== 0) {
                event.stopPropagation()
                event.preventDefault()
                ret = false
            }
            this.hotkeysService.processKeystrokes()
            this.hotkeysService.emitKeyEvent(event)

            return ret
        }

        this.xterm.attachCustomKeyEventHandler((event: KeyboardEvent) => {
            if (event.getModifierState('Meta') && event.key.toLowerCase() === 'v') {
                event.preventDefault()
                return false
            }
            if (event.getModifierState('Meta') && event.key.startsWith('Arrow')) {
                return false
            }

            return keyboardEventHandler('keydown', event)
        })

        this.xtermCore._scrollToBottom = this.xtermCore.scrollToBottom.bind(this.xtermCore)
        this.xtermCore.scrollToBottom = () => null

        this.resizeHandler = () => {
            try {
                if (this.xterm.element && getComputedStyle(this.xterm.element).getPropertyValue('height') !== 'auto') {
                    let t = window.getComputedStyle(this.xterm.element.parentElement!)
                    let r = parseInt(t.getPropertyValue('height'))
                    let n = Math.max(0, parseInt(t.getPropertyValue('width')))
                    let o = window.getComputedStyle(this.xterm.element)
                    let i = r - (parseInt(o.getPropertyValue('padding-top')) + parseInt(o.getPropertyValue('padding-bottom')))
                    let l = n - (parseInt(o.getPropertyValue('padding-right')) + parseInt(o.getPropertyValue('padding-left'))) - this.xtermCore.viewport.scrollBarWidth
                    let actualCellWidth = this.xtermCore._renderService.dimensions.actualCellWidth || 9
                    let actualCellHeight = this.xtermCore._renderService.dimensions.actualCellHeight || 17
                    let cols = Math.floor(l / actualCellWidth)
                    let rows = Math.floor(i / actualCellHeight)

                    this.xterm.resize(cols, rows)
                }
            } catch (e) {
                // tends to throw when element wasn't shown yet
                console.warn('Could not resize xterm', e)
            }
        }

        this.xtermCore._keyUp = (e: KeyboardEvent) => {
            this.xtermCore.updateCursorStyle(e)
            keyboardEventHandler('keyup', e)
        }
    }

    attach (host: HTMLElement): void {
        this.configure()

        this.xterm.open(host)
        this.opened = true

        if (this.enableWebGL) {
            this.xterm.loadAddon(new WebglAddon())
        }

        this.ready.next()
        this.ready.complete()

        this.xterm.loadAddon(this.search)

        window.addEventListener('resize', this.resizeHandler)

        this.resizeHandler()

        host.addEventListener('dragOver', (event: any) => this.dragOver.next(event))
        host.addEventListener('drop', event => this.drop.next(event))

        host.addEventListener('mousedown', event => this.mouseEvent.next(event as MouseEvent))
        host.addEventListener('mouseup', event => this.mouseEvent.next(event as MouseEvent))
        host.addEventListener('mousewheel', event => this.mouseEvent.next(event as MouseEvent))

        const ro = new window['ResizeObserver'](() => this.resizeHandler())
        ro.observe(host)
    }

    detach (_host: HTMLElement): void {
        window.removeEventListener('resize', this.resizeHandler)
    }

    getSelection (): string {
        return this.xterm.getSelection()
    }

    copySelection (): void {
        require('electron').remote.clipboard.write({
            text: this.getSelection(),
            html: this.getSelectionAsHTML(),
        })
    }

    clearSelection (): void {
        this.xterm.clearSelection()
    }

    focus (): void {
        setTimeout(() => this.xterm.focus())
    }

    write (data: string): void {
        this.xterm.write(data)
    }

    clear (): void {
        this.xterm.clear()
    }

    visualBell (): void {
        this.xtermCore.bell()
    }

    scrollToBottom (): void {
        this.xtermCore._scrollToBottom()
    }

    configure (): void {
        const config = this.configService.store

        setImmediate(() => {
            if (this.xterm.cols && this.xterm.rows && this.xtermCore.charMeasure) {
                if (this.xtermCore.charMeasure) {
                    this.xtermCore.charMeasure.measure(this.xtermCore.options)
                }
                if (this.xtermCore.renderer) {
                    this.xtermCore.renderer._updateDimensions()
                }
                this.resizeHandler()
            }
        })

        this.xterm.setOption('fontFamily', getCSSFontFamily(config))
        this.xterm.setOption('bellStyle', config.terminal.bell)
        this.xterm.setOption('cursorStyle', {
            beam: 'bar',
        }[config.terminal.cursor] || config.terminal.cursor)
        this.xterm.setOption('cursorBlink', config.terminal.cursorBlink)
        this.xterm.setOption('macOptionIsMeta', config.terminal.altIsMeta)
        this.xterm.setOption('scrollback', 100000)
        this.configuredFontSize = config.terminal.fontSize
        this.setFontSize()

        this.copyOnSelect = config.terminal.copyOnSelect

        const theme: ITheme = {
            foreground: config.terminal.colorScheme.foreground,
            background: config.terminal.background === 'colorScheme' ? config.terminal.colorScheme.background : '#00000000',
            cursor: config.terminal.colorScheme.cursor,
        }

        for (let i = 0; i < COLOR_NAMES.length; i++) {
            theme[COLOR_NAMES[i]] = config.terminal.colorScheme.colors[i]
        }

        if (this.xtermCore._colorManager && !deepEqual(this.configuredTheme, theme)) {
            this.xterm.setOption('theme', theme)
            this.configuredTheme = theme
        }

        if (this.opened && config.terminal.ligatures && !this.ligaturesAddon) {
            this.ligaturesAddon = new LigaturesAddon()
            this.xterm.loadAddon(this.ligaturesAddon)
        }
    }

    setZoom (zoom: number): void {
        this.zoom = zoom
        this.setFontSize()
    }

    findNext (term: string, searchOptions?: SearchOptions): boolean {
        return this.search.findNext(term, searchOptions)
    }

    findPrevious (term: string, searchOptions?: SearchOptions): boolean {
        return this.search.findPrevious(term, searchOptions)
    }

    private setFontSize () {
        this.xterm.setOption('fontSize', this.configuredFontSize * Math.pow(1.1, this.zoom))
        this.resizeHandler()
    }

    private getSelectionAsHTML (): string {
        let html = `<div style="font-family: '${this.configService.store.terminal.font}', monospace; white-space: pre">`
        const selection = this.xterm.getSelectionPosition()
        if (!selection) {
            return ''
        }
        if (selection.startRow === selection.endRow) {
            html += this.getLineAsHTML(selection.startRow, selection.startColumn, selection.endColumn)
        } else {
            html += this.getLineAsHTML(selection.startRow, selection.startColumn, this.xterm.cols)
            for (let y = selection.startRow! + 1; y < selection.endRow; y++) {
                html += this.getLineAsHTML(y, 0, this.xterm.cols)
            }
            html += this.getLineAsHTML(selection.endRow, 0, selection.endColumn)
        }
        html += '</div>'
        return html
    }

    private getHexColor (mode: number, color: number, def: string): string {
        if (mode === Attributes.CM_RGB) {
            const rgb = AttributeData.toColorRGB(color)
            return rgb.map(x => x.toString(16).padStart(2, '0')).join('')
        }
        if (mode === Attributes.CM_P16 || mode === Attributes.CM_P256) {
            return this.configService.store.terminal.colorScheme.colors[color]
        }
        return def
    }

    private getLineAsHTML (y: number, start: number, end: number): string {
        let html = '<div>'
        let lastStyle: string|null = null
        const line = (this.xterm.buffer.getLine(y) as any)._line
        const cell = new CellData()
        for (let i = start; i < end; i++) {
            line.loadCell(i, cell)
            const fg = this.getHexColor(cell.getFgColorMode(), cell.getFgColor(), this.configService.store.terminal.colorScheme.foreground)
            const bg = this.getHexColor(cell.getBgColorMode(), cell.getBgColor(), this.configService.store.terminal.colorScheme.background)
            const style = `color: ${fg}; background: ${bg}; font-weight: ${cell.isBold() ? 'bold' : 'normal'}; font-style: ${cell.isItalic() ? 'italic' : 'normal'}; text-decoration: ${cell.isUnderline() ? 'underline' : 'none'}`
            if (style !== lastStyle) {
                if (lastStyle !== null) {
                    html += '</span>'
                }
                html += `<span style="${style}">`
                lastStyle = style
            }
            html += line.getString(i) || ' '
        }
        html += '</span></div>'
        return html
    }
}

/** @hidden */
export class XTermWebGLFrontend extends XTermFrontend {
    protected enableWebGL = true
}
