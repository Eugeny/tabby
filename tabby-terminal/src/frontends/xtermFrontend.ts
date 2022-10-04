import { BehaviorSubject, filter, firstValueFrom, takeUntil } from 'rxjs'
import { Injector } from '@angular/core'
import { ConfigService, getCSSFontFamily, HostAppService, HotkeysService, Platform, PlatformService } from 'tabby-core'
import { Frontend, SearchOptions, SearchState } from './frontend'
import { Terminal, ITheme } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { LigaturesAddon } from 'xterm-addon-ligatures'
import { ISearchOptions, SearchAddon } from 'xterm-addon-search'
import { WebglAddon } from 'xterm-addon-webgl'
import { Unicode11Addon } from 'xterm-addon-unicode11'
import { SerializeAddon } from 'xterm-addon-serialize'
import { ImageAddon } from 'xterm-addon-image'
import { CanvasAddon } from 'xterm-addon-canvas'
import './xterm.css'
import deepEqual from 'deep-equal'
import { Attributes } from 'xterm/src/common/buffer/Constants'
import { AttributeData } from 'xterm/src/common/buffer/AttributeData'
import { CellData } from 'xterm/src/common/buffer/CellData'

const COLOR_NAMES = [
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
]

class FlowControl {
    private blocked = false
    private blocked$ = new BehaviorSubject<boolean>(false)
    private pendingCallbacks = 0
    private lowWatermark = 5
    private highWatermark = 10
    private bytesWritten = 0
    private bytesThreshold = 1024 * 128

    constructor (private xterm: Terminal) { }

    async write (data: string) {
        if (this.blocked) {
            await firstValueFrom(this.blocked$.pipe(filter(x => !x)))
        }
        this.bytesWritten += data.length
        if (this.bytesWritten > this.bytesThreshold) {
            this.pendingCallbacks++
            this.bytesWritten = 0
            if (!this.blocked && this.pendingCallbacks > this.highWatermark) {
                this.blocked = true
                this.blocked$.next(true)
            }
            this.xterm.write(data, () => {
                this.pendingCallbacks--
                if (this.blocked && this.pendingCallbacks < this.lowWatermark) {
                    this.blocked = false
                    this.blocked$.next(false)
                }
            })
        } else {
            this.xterm.write(data)
        }
    }
}

/** @hidden */
export class XTermFrontend extends Frontend {
    enableResizing = true
    xterm: Terminal
    protected xtermCore: any
    protected enableWebGL = false
    private element?: HTMLElement
    private configuredFontSize = 0
    private configuredLinePadding = 0
    private zoom = 0
    private resizeHandler: () => void
    private configuredTheme: ITheme = {}
    private copyOnSelect = false
    private search = new SearchAddon()
    private searchState: SearchState = { resultCount: 0 }
    private fitAddon = new FitAddon()
    private serializeAddon = new SerializeAddon()
    private ligaturesAddon?: LigaturesAddon
    private webGLAddon?: WebglAddon
    private canvasAddon?: CanvasAddon
    private opened = false
    private resizeObserver?: any
    private flowControl: FlowControl

    private configService: ConfigService
    private hotkeysService: HotkeysService
    private platformService: PlatformService
    private hostApp: HostAppService

    constructor (injector: Injector) {
        super(injector)
        this.configService = injector.get(ConfigService)
        this.hotkeysService = injector.get(HotkeysService)
        this.platformService = injector.get(PlatformService)
        this.hostApp = injector.get(HostAppService)

        this.xterm = new Terminal({
            allowTransparency: true,
            allowProposedApi: true,
            overviewRulerWidth: 8,
            windowsMode: process.platform === 'win32',
        })
        this.flowControl = new FlowControl(this.xterm)
        this.xtermCore = this.xterm['_core']

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
        this.xterm.onBell(() => {
            this.bell.next()
        })

        this.xterm.loadAddon(this.fitAddon)
        this.xterm.loadAddon(this.serializeAddon)
        this.xterm.loadAddon(new Unicode11Addon())
        this.xterm.unicode.activeVersion = '11'

        if (this.configService.store.terminal.sixel) {
            this.xterm.loadAddon(new ImageAddon(
                URL.createObjectURL(
                    new Blob(
                        [require('xterm-addon-image/lib/xterm-addon-image-worker.js')],
                        { type: 'application/javascript' },
                    ),
                ),
            ))
        }

        const keyboardEventHandler = (name: string, event: KeyboardEvent) => {
            if (this.isAlternateScreenActive()) {
                let modifiers = 0
                modifiers += event.ctrlKey ? 1 : 0
                modifiers += event.altKey ? 1 : 0
                modifiers += event.shiftKey ? 1 : 0
                modifiers += event.metaKey ? 1 : 0
                if (event.key.startsWith('Arrow') && modifiers === 1) {
                    return true
                }
            }

            // Ctrl-/
            if (event.type === 'keydown' && event.key === '/' && event.ctrlKey) {
                this.input.next(Buffer.from('\u001f', 'binary'))
                return false
            }

            // Ctrl-@
            if (event.type === 'keydown' && event.key === '@' && event.ctrlKey) {
                this.input.next(Buffer.from('\u0000', 'binary'))
                return false
            }

            this.hotkeysService.pushKeyEvent(name, event)

            let ret = true
            if (this.hotkeysService.matchActiveHotkey(true) !== null) {
                event.stopPropagation()
                event.preventDefault()
                ret = false
            }
            return ret
        }

        this.xterm.attachCustomKeyEventHandler((event: KeyboardEvent) => {
            if (this.hostApp.platform !== Platform.Web) {
                if (
                    event.getModifierState('Meta') && event.key.toLowerCase() === 'v' ||
                    event.key === 'Insert' && event.shiftKey
                ) {
                    event.preventDefault()
                    return false
                }
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
                    this.fitAddon.fit()
                    this.xtermCore.viewport._refresh()
                }
            } catch (e) {
                // tends to throw when element wasn't shown yet
                console.warn('Could not resize xterm', e)
            }
        }

        const oldKeyUp = this.xtermCore._keyUp.bind(this.xtermCore)
        this.xtermCore._keyUp = (e: KeyboardEvent) => {
            this.xtermCore.updateCursorStyle(e)
            if (keyboardEventHandler('keyup', e)) {
                oldKeyUp(e)
            }
        }

        this.xterm.buffer.onBufferChange(() => {
            const altBufferActive = this.xterm.buffer.active.type === 'alternate'
            this.alternateScreenActive.next(altBufferActive)
        })
    }

    async attach (host: HTMLElement): Promise<void> {
        this.configure()
        this.element = host

        this.xterm.open(host)
        this.opened = true

        // Work around font loading bugs
        await new Promise(resolve => setTimeout(resolve, this.hostApp.platform === Platform.Web ? 1000 : 0))

        if (this.enableWebGL) {
            this.webGLAddon = new WebglAddon()
            this.xterm.loadAddon(this.webGLAddon)
            this.platformService.displayMetricsChanged$.pipe(
                takeUntil(this.destroyed$),
            ).subscribe(() => {
                this.webGLAddon?.clearTextureAtlas()
            })
        } else {
            this.canvasAddon = new CanvasAddon()
            this.xterm.loadAddon(this.canvasAddon)
            this.platformService.displayMetricsChanged$.pipe(
                takeUntil(this.destroyed$),
            ).subscribe(() => {
                this.canvasAddon?.clearTextureAtlas()
            })
        }

        this.ready.next()
        this.ready.complete()

        this.xterm.loadAddon(this.search)

        this.search.onDidChangeResults(state => {
            this.searchState = state ?? { resultCount: 0 }
        })

        window.addEventListener('resize', this.resizeHandler)

        this.resizeHandler()

        host.addEventListener('dragOver', (event: any) => this.dragOver.next(event))
        host.addEventListener('drop', event => this.drop.next(event))

        host.addEventListener('mousedown', event => this.mouseEvent.next(event))
        host.addEventListener('mouseup', event => this.mouseEvent.next(event))
        host.addEventListener('mousewheel', event => this.mouseEvent.next(event as MouseEvent))
        host.addEventListener('contextmenu', event => {
            event.preventDefault()
            event.stopPropagation()
        })

        this.resizeObserver = new window['ResizeObserver'](() => setTimeout(() => this.resizeHandler()))
        this.resizeObserver.observe(host)
    }

    detach (_host: HTMLElement): void {
        window.removeEventListener('resize', this.resizeHandler)
        this.resizeObserver?.disconnect()
        delete this.resizeObserver
    }

    destroy (): void {
        super.destroy()
        this.webGLAddon?.dispose()
        this.canvasAddon?.dispose()
        this.xterm.dispose()
    }

    getSelection (): string {
        return this.xterm.getSelection()
    }

    copySelection (): void {
        const text = this.getSelection()
        if (!text.trim().length) {
            return
        }
        if (text.length < 1024 * 32 && this.configService.store.terminal.copyAsHTML) {
            this.platformService.setClipboard({
                text: this.getSelection(),
                html: this.getSelectionAsHTML(),
            })
        } else {
            this.platformService.setClipboard({
                text: this.getSelection(),
            })
        }
    }

    selectAll (): void {
        this.xterm.selectAll()
    }

    clearSelection (): void {
        this.xterm.clearSelection()
    }

    focus (): void {
        setTimeout(() => this.xterm.focus())
    }

    async write (data: string): Promise<void> {
        await this.flowControl.write(data)
    }

    clear (): void {
        this.xterm.clear()
    }

    visualBell (): void {
        if (this.element) {
            this.element.style.animation = 'none'
            setTimeout(() => {
                this.element!.style.animation = 'terminalShakeFrames 0.3s ease'
            })
        }
    }

    scrollToTop (): void {
        this.xterm.scrollToTop()
    }

    scrollPages (pages: number): void {
        this.xterm.scrollPages(pages)
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

        this.xterm.options.fontFamily = getCSSFontFamily(config)
        this.xterm.options.cursorStyle = {
            beam: 'bar',
        }[config.terminal.cursor] || config.terminal.cursor
        this.xterm.options.cursorBlink = config.terminal.cursorBlink
        this.xterm.options.macOptionIsMeta = config.terminal.altIsMeta
        this.xterm.options.scrollback = config.terminal.scrollbackLines
        this.xterm.options.wordSeparator = config.terminal.wordSeparator
        this.xterm.options.drawBoldTextInBrightColors = config.terminal.drawBoldTextInBrightColors
        this.xterm.options.fontWeight = config.terminal.fontWeight
        this.xterm.options.fontWeightBold = config.terminal.fontWeightBold
        this.configuredFontSize = config.terminal.fontSize
        this.configuredLinePadding = config.terminal.linePadding
        this.setFontSize()

        this.copyOnSelect = config.terminal.copyOnSelect

        const theme: ITheme = {
            foreground: config.terminal.colorScheme.foreground,
            selectionBackground: config.terminal.colorScheme.selection || '#88888888',
            selectionForeground: config.terminal.colorScheme.selectionForeground || undefined,
            background: config.terminal.background === 'colorScheme' ? config.terminal.colorScheme.background : '#00000000',
            cursor: config.terminal.colorScheme.cursor,
            cursorAccent: config.terminal.colorScheme.cursorAccent,
        }

        for (let i = 0; i < COLOR_NAMES.length; i++) {
            theme[COLOR_NAMES[i]] = config.terminal.colorScheme.colors[i]
        }

        if (this.xtermCore._colorManager && !deepEqual(this.configuredTheme, theme)) {
            this.xterm.options.theme = theme
            this.configuredTheme = theme
        }

        if (this.opened && config.terminal.ligatures && !this.ligaturesAddon && this.hostApp.platform !== Platform.Web) {
            this.ligaturesAddon = new LigaturesAddon()
            this.xterm.loadAddon(this.ligaturesAddon)
        }
    }

    setZoom (zoom: number): void {
        this.zoom = zoom
        this.setFontSize()
    }

    private getSearchOptions (searchOptions?: SearchOptions): ISearchOptions {
        return {
            ...searchOptions,
            decorations: {
                matchOverviewRuler: '#cccc00',
                activeMatchColorOverviewRuler: '#ffff00',
                matchBorder: '#cc0',
                activeMatchBorder: '#ff0',
                activeMatchBackground: 'rgba(255, 255, 0, 0.125)',
            },
        }
    }

    private wrapSearchResult (result: boolean): SearchState {
        if (!result) {
            return { resultCount: 0 }
        }
        return this.searchState
    }

    findNext (term: string, searchOptions?: SearchOptions): SearchState {
        return this.wrapSearchResult(
            this.search.findNext(term, this.getSearchOptions(searchOptions))
        )
    }

    findPrevious (term: string, searchOptions?: SearchOptions): SearchState {
        return this.wrapSearchResult(
            this.search.findPrevious(term, this.getSearchOptions(searchOptions))
        )
    }

    cancelSearch (): void {
        this.search.clearDecorations()
        this.focus()
    }

    saveState (): any {
        return this.serializeAddon.serialize({
            excludeAltBuffer: true,
            excludeModes: true,
            scrollback: 1000,
        })
    }

    restoreState (state: string): void {
        this.xterm.write(state)
    }

    supportsBracketedPaste (): boolean {
        return this.xterm.modes.bracketedPasteMode
    }

    isAlternateScreenActive (): boolean {
        return this.xterm.buffer.active.type === 'alternate'
    }

    private setFontSize () {
        const scale = Math.pow(1.1, this.zoom)
        this.xterm.options.fontSize = this.configuredFontSize * scale
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        this.xterm.options.lineHeight = (this.configuredFontSize + this.configuredLinePadding * 2) / this.configuredFontSize * scale
        this.resizeHandler()
    }

    private getSelectionAsHTML (): string {
        let html = `<div style="font-family: '${this.configService.store.terminal.font}', monospace; white-space: pre">`
        const selection = this.xterm.getSelectionPosition()
        if (!selection) {
            return ''
        }
        if (selection.start.y === selection.end.y) {
            html += this.getLineAsHTML(selection.start.y, selection.start.x, selection.end.x)
        } else {
            html += this.getLineAsHTML(selection.start.y, selection.start.x, this.xterm.cols)
            for (let y = selection.start.y + 1; y < selection.end.y; y++) {
                html += this.getLineAsHTML(y, 0, this.xterm.cols)
            }
            html += this.getLineAsHTML(selection.end.y, 0, selection.end.x)
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
        const outerLine = this.xterm.buffer.active.getLine(y)
        if (!outerLine) {
            return ''
        }
        const line = outerLine['_line']
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
