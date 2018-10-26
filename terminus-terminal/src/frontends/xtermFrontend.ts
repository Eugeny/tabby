import { Frontend } from './frontend'
import { Terminal, ITheme } from 'xterm'
import * as fit from 'xterm/lib/addons/fit/fit'
import * as ligatures from 'xterm-addon-ligatures-tmp'
import 'xterm/dist/xterm.css'
import deepEqual = require('deep-equal')

Terminal.applyAddon(fit)
Terminal.applyAddon(ligatures)

export class XTermFrontend extends Frontend {
    enableResizing = true
    xterm: Terminal
    private configuredFontSize = 0
    private zoom = 0
    private resizeHandler: any
    private configuredTheme: ITheme = {}

    constructor () {
        super()
        this.xterm = new Terminal({
            allowTransparency: true,
            enableBold: true,
        })

        this.xterm.on('data', data => {
            this.input.next(data)
        })
        this.xterm.on('resize', ({ cols, rows }) => {
            this.resize.next({ rows, columns: cols })
        })
        this.xterm.on('title', title => {
            this.title.next(title)
        })
    }

    attach (host: HTMLElement): void {
        this.xterm.open(host)
        this.ready.next(null)
        this.ready.complete()

        this.resizeHandler = () => (this.xterm as any).fit()
        window.addEventListener('resize', this.resizeHandler)

        this.resizeHandler()

        host.addEventListener('dragOver', (event: any) => this.dragOver.next(event))
        host.addEventListener('drop', event => this.drop.next(event))

        host.addEventListener('mousedown', event => this.mouseEvent.next(event as MouseEvent))
        host.addEventListener('mouseup', event => this.mouseEvent.next(event as MouseEvent))
        host.addEventListener('mousewheel', event => this.mouseEvent.next(event as MouseEvent))
    }

    detach (host: HTMLElement): void {
        window.removeEventListener('resize', this.resizeHandler)
    }

    getSelection (): string {
        return this.xterm.getSelection()
    }

    copySelection (): void {
        (navigator as any).clipboard.writeText(this.getSelection())
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
        (this.xterm as any).bell()
    }

    scrollToBottom (): void {
        this.xterm.scrollToBottom()
    }

    configure (config: any): void {
        this.xterm.setOption('fontFamily', `"${config.terminal.font}", "monospace-fallback", monospace`)
        this.xterm.setOption('bellStyle', config.terminal.bell)
        this.xterm.setOption('cursorStyle', {
            beam: 'bar'
        }[config.terminal.cuxrsor] || config.terminal.cursor)
        this.xterm.setOption('cursorBlink', config.terminal.cursorBlink)
        this.xterm.setOption('macOptionIsMeta', config.terminal.altIsMeta)
        // this.xterm.setOption('colors', )
        this.configuredFontSize = config.terminal.fontSize
        this.setFontSize()

        let theme: ITheme = {
            foreground: config.terminal.colorScheme.foreground,
            background: (config.terminal.background === 'colorScheme') ? config.terminal.colorScheme.background : 'transparent',
            cursor: config.terminal.colorScheme.cursor,
        }

        const colorNames = [
            'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
            'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite'
        ]

        for (let i = 0; i < colorNames.length; i++) {
            theme[colorNames[i]] = config.terminal.colorScheme.colors[i]
        }

        if (!deepEqual(this.configuredTheme, theme)) {
            this.xterm.setOption('theme', theme)
            this.configuredTheme = theme
        }

        if (config.terminal.ligatures && this.xterm.element) {
            (this.xterm as any).enableLigatures()
        }
    }

    setZoom (zoom: number): void {
        this.zoom = zoom
        this.setFontSize()
    }

    private setFontSize () {
        this.xterm.setOption('fontSize', this.configuredFontSize * Math.pow(1.1, this.zoom))
    }
}
