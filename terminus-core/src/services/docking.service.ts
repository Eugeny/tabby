import { Injectable } from '@angular/core'
import { ConfigService } from '../services/config.service'
import { ElectronService } from '../services/electron.service'
import { HostAppService, Bounds } from '../services/hostApp.service'

@Injectable({ providedIn: 'root' })
export class DockingService {
    /** @hidden */
    constructor (
        private electron: ElectronService,
        private config: ConfigService,
        private hostApp: HostAppService,
    ) {
        electron.screen.on('display-removed', () => this.repositionWindow())
        electron.screen.on('display-metrics-changed', () => this.repositionWindow())
    }

    dock (): void {
        const dockSide = this.config.store.appearance.dock

        if (dockSide === 'off') {
            this.hostApp.setAlwaysOnTop(false)
            return
        }

        let display = this.electron.screen.getAllDisplays()
            .filter(x => x.id === this.config.store.appearance.dockScreen)[0]
        if (!display) {
            display = this.getCurrentScreen()
        }

        const newBounds: Bounds = { x: 0, y: 0, width: 0, height: 0 }

        const fill = this.config.store.appearance.dockFill <= 1 ? this.config.store.appearance.dockFill : 1
        const [minWidth, minHeight] = this.hostApp.getWindow().getMinimumSize()

        if (dockSide === 'left' || dockSide === 'right') {
            newBounds.width = Math.max(minWidth, Math.round(fill * display.bounds.width))
            newBounds.height = display.bounds.height
        }
        if (dockSide === 'top' || dockSide === 'bottom') {
            newBounds.width = display.bounds.width
            newBounds.height = Math.max(minHeight, Math.round(fill * display.bounds.height))
        }
        if (dockSide === 'right') {
            newBounds.x = display.bounds.x + display.bounds.width - newBounds.width
        } else {
            newBounds.x = display.bounds.x
        }
        if (dockSide === 'bottom') {
            newBounds.y = display.bounds.y + display.bounds.height - newBounds.height
        } else {
            newBounds.y = display.bounds.y
        }

        this.hostApp.setAlwaysOnTop(true)
        setImmediate(() => {
            this.hostApp.setBounds(newBounds)
        })
    }

    getCurrentScreen (): Electron.Display {
        return this.electron.screen.getDisplayNearestPoint(this.electron.screen.getCursorScreenPoint())
    }

    getScreens (): Electron.Display[] {
        const primaryDisplayID = this.electron.screen.getPrimaryDisplay().id
        return this.electron.screen.getAllDisplays().sort((a, b) =>
            a.bounds.x === b.bounds.x ? a.bounds.y - b.bounds.y : a.bounds.x - b.bounds.x
        ).map((display, index) => {
            return {
                ...display,
                id: display.id,
                name: display.id === primaryDisplayID ? 'Primary Display' : `Display ${index +1}`,
            }
        })
    }

    private repositionWindow () {
        const [x, y] = this.hostApp.getWindow().getPosition()
        for (const screen of this.electron.screen.getAllDisplays()) {
            const bounds = screen.bounds
            if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
                return
            }
        }
        const screen = this.electron.screen.getPrimaryDisplay()
        this.hostApp.getWindow().setPosition(screen.bounds.x, screen.bounds.y)
    }
}
