import { BrowserWindow, ipcMain, Point, Rectangle, WebContents } from 'electron'
import type { Application } from './app'
import type { Window } from './window'

/** Space between the tab image and the label underneath */
const LABEL_HEIGHT = 34
const MIN_WIDTH = 220
/** Squeezed tabs are still shown wide enough to read their title */
const MIN_TAB_WIDTH = 160

export interface TabDragPreviewOptions {
    /** Where the dragged tab is drawn, relative to the window */
    rect: Rectangle
    /** Where the user grabbed the tab, relative to `rect` */
    grab: Point
    title: string
    fontFamily: string
    fontSize: string
    background: string
    foreground: string
    /** The tab's color, if it has one */
    accent: string|null
    /** Whether dropping into empty space moves the window instead of opening a new one */
    movesWindow: boolean
    labels: {
        newWindow: string
        moveWindow: string
        moveToWindow: string
    }
}

const PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><style>
html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; user-select: none; }
#tab { position: relative; box-sizing: border-box; display: flex; align-items: center; padding: 0 12px;
    overflow: hidden; white-space: nowrap; border-radius: 3px; box-shadow: 0 4px 14px rgba(0, 0, 0, .55); }
#title { overflow: hidden; text-overflow: ellipsis; }
#accent { position: absolute; left: 0; right: 0; top: 0; height: 3px; }
#label { display: inline-block; margin-top: 8px; padding: 3px 9px; border-radius: 3px; white-space: nowrap; font-size: 12px;
    color: #fff; background: rgba(20, 20, 20, .88); box-shadow: 0 2px 8px rgba(0, 0, 0, .4); }
</style></head><body><div id="tab"><div id="accent"></div><div id="title"></div></div><div id="label"></div></body></html>`

function contains (bounds: Rectangle, point: Point): boolean {
    return point.x >= bounds.x && point.x < bounds.x + bounds.width && point.y >= bounds.y && point.y < bounds.y + bounds.height
}

/**
 * Shows the tab being dragged next to the cursor once it leaves its window,
 * together with what dropping it there will do
 */
export class TabDragPreview {
    private window: BrowserWindow|null = null
    private source: WebContents|null = null
    private options: TabDragPreviewOptions|null = null
    private ready: Promise<void>|null = null
    private label = ''
    /** The other window the tab is currently dragged over */
    private hoveredWindow: Window|null = null
    private watchedContents = new WeakSet<WebContents>()

    init (app: Application): void {
        ipcMain.on('app:tab-drag-preview:start', (event, options: TabDragPreviewOptions) => {
            this.start(event.sender, options)
        })
        ipcMain.on('app:tab-drag-preview:move', (event, x: number, y: number) => {
            if (event.sender === this.source) {
                this.move(app, { x, y })
            }
        })
        ipcMain.on('app:tab-drag-preview:end', event => {
            if (event.sender === this.source) {
                this.end()
            }
        })
    }

    private start (source: WebContents, options: TabDragPreviewOptions) {
        this.end()
        this.source = source
        this.options = options
        if (!this.watchedContents.has(source)) {
            this.watchedContents.add(source)
            source.once('destroyed', () => {
                if (this.source === source) {
                    this.end()
                }
            })
        }

        const window = new BrowserWindow({
            width: Math.max(options.rect.width, MIN_WIDTH),
            height: options.rect.height + LABEL_HEIGHT,
            show: false,
            frame: false,
            transparent: true,
            resizable: false,
            focusable: false,
            skipTaskbar: true,
            hasShadow: false,
            alwaysOnTop: true,
            webPreferences: {
                sandbox: true,
                contextIsolation: true,
                nodeIntegration: false,
                backgroundThrottling: false,
            },
        })
        window.setIgnoreMouseEvents(true)
        window.setAlwaysOnTop(true, 'pop-up-menu')
        this.window = window

        this.ready = (async () => {
            await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE)}`)
            if (this.window !== window || window.isDestroyed()) {
                return
            }
            const style = {
                width: `${Math.max(options.rect.width, MIN_TAB_WIDTH)}px`,
                height: `${options.rect.height}px`,
                fontFamily: options.fontFamily,
                fontSize: options.fontSize,
                background: options.background,
                color: options.foreground,
            }
            await window.webContents.executeJavaScript(`(() => {
                const tab = document.getElementById('tab')
                Object.assign(tab.style, ${JSON.stringify(style)})
                document.getElementById('title').textContent = ${JSON.stringify(options.title)}
                document.getElementById('label').style.fontFamily = ${JSON.stringify(options.fontFamily)}
                document.getElementById('accent').style.background = ${JSON.stringify(options.accent ?? 'transparent')}
            })()`)
        })().catch(error => console.error('Could not set up the tab drag preview:', error))
    }

    private async move (app: Application, point: Point) {
        const window = this.window
        if (!window || !this.source || !this.options || window.isDestroyed()) {
            return
        }

        const sourceWindow = BrowserWindow.fromWebContents(this.source)
        if (sourceWindow && contains(sourceWindow.getBounds(), point)) {
            // The tab bar itself shows the tab while it's over its own window
            this.setHoveredWindow(null)
            window.hide()
            return
        }

        const target = app.findWindowAt(point, this.source)
        this.setHoveredWindow(target)
        // Lets the other window show where the tab would go
        target?.send('host:tab-drag-over', point.x, point.y, this.options.title)
        const labels = this.options.labels
        const label = target ? labels.moveToWindow : this.options.movesWindow ? labels.moveWindow : labels.newWindow

        await this.ready
        if (this.window !== window || window.isDestroyed()) {
            return
        }
        if (label !== this.label) {
            this.label = label
            window.webContents.executeJavaScript(`document.getElementById('label').textContent = ${JSON.stringify(label)}`)
        }
        window.setPosition(Math.round(point.x - this.options.grab.x), Math.round(point.y - this.options.grab.y))
        if (!window.isVisible()) {
            window.showInactive()
        }
    }

    private setHoveredWindow (window: Window|null) {
        if (window === this.hoveredWindow) {
            return
        }
        if (this.hoveredWindow && !this.hoveredWindow.isDestroyed()) {
            this.hoveredWindow.send('host:tab-drag-leave')
        }
        this.hoveredWindow = window
    }

    private end () {
        this.setHoveredWindow(null)
        if (this.window && !this.window.isDestroyed()) {
            this.window.destroy()
        }
        this.window = null
        this.source = null
        this.options = null
        this.ready = null
        this.label = ''
    }
}
