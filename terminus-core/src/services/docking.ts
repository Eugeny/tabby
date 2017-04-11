import { Injectable } from '@angular/core'
import { HostAppService } from '../services/hostApp'
import { ConfigService } from '../services/config'
import { ElectronService } from '../services/electron'


export interface IScreen {
    id: string
    name: string
}

@Injectable()
export class DockingService {
    constructor(
        private electron: ElectronService,
        private config: ConfigService,
        private hostApp: HostAppService,
    ) {}

    dock () {
        let display = this.electron.screen.getAllDisplays()
            .filter((x) => x.id == this.config.full().appearance.dockScreen)[0]
        if (!display) {
            display = this.getCurrentScreen()
        }

        let dockSide = this.config.full().appearance.dock
        let newBounds: Electron.Rectangle = { x: 0, y: 0, width: 0, height: 0 }
        let fill = this.config.full().appearance.dockFill

        if (dockSide == 'off') {
            this.hostApp.setAlwaysOnTop(false)
            return
        }
        if (dockSide == 'left' || dockSide == 'right') {
            newBounds.width = Math.round(fill * display.bounds.width)
            newBounds.height = display.bounds.height
        }
        if (dockSide == 'top' || dockSide == 'bottom') {
            newBounds.width = display.bounds.width
            newBounds.height = Math.round(fill * display.bounds.height)
        }
        if (dockSide == 'right') {
            newBounds.x = display.bounds.x + display.bounds.width * (1.0 - fill)
        } else {
            newBounds.x = display.bounds.x
        }
        if (dockSide == 'bottom') {
            newBounds.y = display.bounds.y + display.bounds.height * (1.0 - fill)
        } else {
            newBounds.y = display.bounds.y
        }

        this.hostApp.setAlwaysOnTop(true)
        this.hostApp.unmaximize()
        this.hostApp.setBounds(newBounds)
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
