import { Injectable } from '@angular/core'
import { ConfigService } from '../services/config.service'
import { ElectronService } from '../services/electron.service'
import { HostAppService, Bounds } from '../services/hostApp.service'

export interface IScreen {
    id: string
    name: string
}

@Injectable()
export class DockingService {
    constructor (
        private electron: ElectronService,
        private config: ConfigService,
        private hostApp: HostAppService,
    ) {}

    dock () {
        let display = this.electron.screen.getAllDisplays()
            .filter((x) => x.id === this.config.store.appearance.dockScreen)[0]
        if (!display) {
            display = this.getCurrentScreen()
        }

        let dockSide = this.config.store.appearance.dock
        let newBounds: Bounds = { x: 0, y: 0, width: 0, height: 0 }
        let fill = this.config.store.appearance.dockFill

        if (dockSide === 'off') {
            this.hostApp.setAlwaysOnTop(false)
            return
        }
        if (dockSide === 'left' || dockSide === 'right') {
            newBounds.width = Math.round(fill * display.bounds.width)
            newBounds.height = display.bounds.height
        }
        if (dockSide === 'top' || dockSide === 'bottom') {
            newBounds.width = display.bounds.width
            newBounds.height = Math.round(fill * display.bounds.height)
        }
        if (dockSide === 'right') {
            newBounds.x = display.bounds.x + display.bounds.width * (1.0 - fill)
        } else {
            newBounds.x = display.bounds.x
        }
        if (dockSide === 'bottom') {
            newBounds.y = display.bounds.y + display.bounds.height * (1.0 - fill)
        } else {
            newBounds.y = display.bounds.y
        }

        this.hostApp.setAlwaysOnTop(true)
        setImmediate(() => {
            this.hostApp.setBounds(newBounds)
        })
    }

    getCurrentScreen () {
        return this.electron.screen.getDisplayNearestPoint(this.electron.screen.getCursorScreenPoint())
    }

    getScreens () {
        return this.electron.screen.getAllDisplays().map((display, index) => {
            return {
                id: display.id,
                name: {
                    0: 'Primary display',
                    1: 'Secondary display',
                }[index] || `Display ${index + 1}`
            }
        })
    }
}
